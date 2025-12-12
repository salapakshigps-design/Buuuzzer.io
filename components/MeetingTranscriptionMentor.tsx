import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  API_BASE,
  getDeepgramKey,
  updateMeetingStatus,
  getMeetingTranscript,
} from '../services/backendApi';
import { Meeting, MeetingStatus } from '../types';
import { Button } from './Button';
import { jsPDF } from 'jspdf';

interface ChunkLine {
  text: string;
  timestamp: string;
  from: string;
}

interface Props {
  meeting: Meeting;
  onBack: () => void;
}

export const MeetingTranscriptionMentor: React.FC<Props> = ({ meeting, onBack }) => {
  const [status, setStatus] = useState<MeetingStatus>(meeting.status);
  const [deepgramKey, setDeepgramKey] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<ChunkLine[]>(() => {
    if (!meeting.transcript) return [];
    return meeting.transcript
      .split('\n')
      .filter(Boolean)
      .map((text) => ({
        text,
        timestamp: new Date().toISOString(),
        from: 'mentor',
      }));
  });
  const [finalTranscript, setFinalTranscript] = useState(meeting.transcript || '');

  const meetingSocketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const deepgramSocketRef = useRef<WebSocket | null>(null);

  const meetingId = meeting.id;
  const meetingKey = meeting.meetingKey;

  const appendLine = useCallback((chunk: ChunkLine) => {
    setLines((prev) => [...prev, chunk]);
    setFinalTranscript((prev) => (prev ? `${prev}\n${chunk.text}` : chunk.text));
  }, []);

  const handleServerChunk = useCallback(
    (payload: { text?: string; timestamp?: string; from?: string }) => {
      if (!payload?.text) return;
      appendLine({
        text: payload.text.trim(),
        timestamp: payload.timestamp || new Date().toISOString(),
        from: payload.from || 'mentor',
      });
    },
    [appendLine]
  );

  const fetchTranscript = useCallback(async () => {
    try {
      const transcript = await getMeetingTranscript(meetingId);
      if (transcript) {
        setFinalTranscript(transcript);
        setLines((prev) => {
          if (prev.length > 0) return prev;
          return transcript
            .split('\n')
            .filter(Boolean)
            .map((line) => ({
              text: line,
              timestamp: new Date().toISOString(),
              from: 'mentor',
            }));
        });
      }
    } catch (err) {
      console.error('Could not refresh transcript', err);
    }
  }, [meetingId]);

  const handleStatus = useCallback(
    (payload: { status: MeetingStatus }) => {
      if (!payload?.status) return;
      setStatus(payload.status);
      if (payload.status === 'COMPLETED') {
        fetchTranscript();
        setIsListening(false);
      }
    },
    [fetchTranscript]
  );

  useEffect(() => {
    const socket = io(API_BASE, {
      transports: ['websocket'],
    });
    meetingSocketRef.current = socket;
    socket.emit('join_meeting', {
      meetingId,
      meetingKey,
      role: 'mentor',
    });
    socket.on('meeting_transcript_chunk', handleServerChunk);
    socket.on('meeting_status', handleStatus);
    socket.on('meeting_error', ({ message }: { message?: string }) => {
      if (message) setError(message);
    });

    return () => {
      socket.disconnect();
      meetingSocketRef.current = null;
    };
  }, [meetingId, meetingKey, handleServerChunk, handleStatus]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const key = await getDeepgramKey();
        if (!active) return;
        setDeepgramKey(key);
      } catch (err) {
        console.error('Failed to load Deepgram key', err);
        if (active) {
          setError('Missing Deepgram key. Configure it in the admin console.');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const stopMedia = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
    }
    if (deepgramSocketRef.current) {
      deepgramSocketRef.current.close();
      deepgramSocketRef.current = null;
    }
  }, []);

  const startDeepgramStream = useCallback(async () => {
    if (!deepgramKey) {
      setError('Deepgram key not available');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
      }
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      const socket = new WebSocket(
        'wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=true',
        ['token', deepgramKey]
      );
      deepgramSocketRef.current = socket;

      socket.onopen = () => {
        setIsListening(true);
        recorder.start(250);
      };

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0 && socket.readyState === 1) {
          socket.send(event.data);
        }
      });

      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        const transcriptPart = payload.channel?.alternatives?.[0]?.transcript;

        if (transcriptPart && payload.is_final) {
          meetingSocketRef.current?.emit('meeting_transcript_chunk', {
            meetingId,
            text: transcriptPart.trim(),
          });
        }
      };

      socket.onerror = (err) => {
        console.error('Deepgram websocket error', err);
        setError('Deepgram connection failed');
      };

      socket.onclose = () => {
        setIsListening(false);
      };
    } catch (err: any) {
      console.error('Microphone error', err);
      setError(err.message || 'Microphone access failed');
    }
  }, [deepgramKey, meetingId]);

  const handleStart = useCallback(async () => {
    if (status === 'COMPLETED' || isListening) return;
    if (status === 'PENDING') {
      setError('Meeting is pending admin approval.');
      return;
    }
    if (status === 'REJECTED') {
      setError('Meeting was rejected.');
      return;
    }
    setError(null);
    try {
      const updated = await updateMeetingStatus(meetingId, 'IN_PROGRESS');
      setStatus(updated.status);
      meetingSocketRef.current?.emit('meeting_status_update', {
        meetingId,
        status: 'IN_PROGRESS',
      });
      await startDeepgramStream();
    } catch (err: any) {
      console.error('Failed to start meeting', err);
      setError(err.message || 'Could not start meeting');
    }
  }, [isListening, meetingId, startDeepgramStream, status]);

  const handleStop = useCallback(async () => {
    if (!isListening && status === 'COMPLETED') return;
    stopMedia();
    setIsListening(false);
    try {
      const updated = await updateMeetingStatus(meetingId, 'COMPLETED');
      setStatus(updated.status);
      meetingSocketRef.current?.emit('meeting_status_update', {
        meetingId,
        status: 'COMPLETED',
      });
      meetingSocketRef.current?.emit('meeting_end', { meetingId });
      fetchTranscript();
    } catch (err: any) {
      console.error('Failed to stop meeting', err);
      setError(err.message || 'Could not complete meeting');
    }
  }, [meetingId, stopMedia, status, fetchTranscript, isListening]);

  useEffect(() => {
    return () => {
      stopMedia();
    };
  }, [stopMedia]);

  const downloadTranscript = () => {
    const text = finalTranscript || lines.map((line) => line.text).join('\n');
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Meeting Transcript - ${meeting.meetingKey}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    const bodyLines = doc.splitTextToSize(text, 180);
    let cursor = 40;
    bodyLines.forEach((line) => {
      if (cursor > 280) {
        doc.addPage();
        cursor = 20;
      }
      doc.text(line, 14, cursor);
      cursor += 6;
    });
    doc.save(`meeting-${meeting.meetingKey}.pdf`);
  };

  const statusLabel = useMemo(() => {
    if (status === 'COMPLETED') return 'Completed';
    if (status === 'IN_PROGRESS') return 'In Progress';
    return 'Scheduled';
  }, [status]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="w-full px-4 py-4 border-b border-gray-800 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={onBack}>
            Back
          </Button>
          {isListening ? (
            <Button variant="danger" onClick={handleStop} className="py-2">
              Stop &amp; Complete
            </Button>
          ) : (
            <Button
              onClick={handleStart}
              disabled={!deepgramKey || status === 'COMPLETED'}
              className="py-2"
            >
              {status === 'IN_PROGRESS' ? 'Resume Streaming' : 'Start Transcription'}
            </Button>
          )}
          <Button variant="secondary" onClick={downloadTranscript} className="py-2">
            Download Transcript
          </Button>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Status</p>
          <p className="text-lg font-semibold">{statusLabel}</p>
        </div>
        <div className="text-xs font-mono text-gray-400">Key: {meetingKey}</div>
      </div>

      <div className="flex-1 w-full px-4 py-4">
        <div className="h-full glass-panel rounded-2xl border border-gray-700 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Meeting With</p>
              <p className="text-2xl font-semibold text-white">{meeting.studentName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-gray-400">Technology</p>
              <p className="text-lg font-semibold">{meeting.technology}</p>
              <p className="text-xs text-gray-500 mt-1">
                Scheduled:{' '}
                {meeting.scheduledAt ? new Date(meeting.scheduledAt).toLocaleString() : 'TBD'}
              </p>
            </div>
          </div>

          {error && (
            <div className="px-4 py-2 border-b border-gray-800 text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-black/40 font-mono text-sm">
            {lines.length === 0 ? (
              <p className="text-gray-600 italic">Waiting for transcript...</p>
            ) : (
              lines.map((line, index) => {
                const prev = index > 0 ? lines[index - 1] : null;
                const prevTime = prev ? new Date(prev.timestamp).getTime() : null;
                const currTime = new Date(line.timestamp).getTime();
                const isParagraphBreak =
                  prevTime !== null && currTime - prevTime > 3000; // > 3s gap

                return (
                  <div
                    key={`${line.timestamp}-${index}`}
                    className={
                      'flex justify-between gap-3' +
                      (isParagraphBreak ? ' mt-4 pt-2 border-t border-gray-800' : '')
                    }
                  >
                    <p className="text-gray-100 break-words">{line.text}</p>
                    <span className="text-[10px] text-gray-500">
                      {new Date(line.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
