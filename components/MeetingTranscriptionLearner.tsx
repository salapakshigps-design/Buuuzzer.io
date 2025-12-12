import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE, getMeetingTranscript } from '../services/backendApi';
import { Meeting } from '../types';
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

export const MeetingTranscriptionLearner: React.FC<Props> = ({ meeting, onBack }) => {
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
  const [status, setStatus] = useState<Meeting['status']>(meeting.status);
  const [finalTranscript, setFinalTranscript] = useState(meeting.transcript || '');
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(API_BASE, {
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.emit('join_meeting', {
      meetingId: meeting.id,
      meetingKey: meeting.meetingKey,
      role: 'learner',
    });

    // simple streaming handler – just append chunks
    socket.on(
      'meeting_transcript_chunk',
      (payload: { text?: string; timestamp?: string; from?: string }) => {
        if (!payload?.text) return;

        const text = payload.text.trim();
        const ts = payload.timestamp || new Date().toISOString();
        const from = payload.from || 'mentor';

        setLines((prev) => [
          ...prev,
          {
            text,
            timestamp: ts,
            from,
          },
        ]);

        setFinalTranscript((prev) => {
          const base = prev || '';
          return base ? `${base}\n${text}` : text;
        });
      }
    );

    socket.on('meeting_status', ({ status: newStatus }: { status?: string }) => {
      if (newStatus) {
        setStatus(newStatus as Meeting['status']);
        if (newStatus === 'COMPLETED') {
          getMeetingTranscript(meeting.id)
            .then((transcript) => {
              if (transcript) {
                setFinalTranscript(transcript);
                setLines((prev) => {
                  if (prev.length > 0) return prev;
                  return transcript
                    .split('\n')
                    .filter(Boolean)
                    .map((text) => ({
                      text,
                      timestamp: new Date().toISOString(),
                      from: 'mentor',
                    }));
                });
              }
            })
            .catch((err) => {
              console.error('Failed to refresh transcript', err);
            });
        }
      }
    });

    socket.on('meeting_error', ({ message }: { message?: string }) => {
      if (message) setError(message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [meeting.id, meeting.meetingKey]);

  const statusLabel = useMemo(() => {
    if (status === 'COMPLETED') return 'Completed';
    if (status === 'IN_PROGRESS') return 'In Progress';
    return 'Scheduled';
  }, [status]);

  const downloadTranscript = () => {
    const text = finalTranscript || lines.map((line) => line.text).join('\n');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFontSize(14);
    doc.text(`Meeting Transcript - ${meeting.meetingKey}`, 40, 40);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 58);
    const bodyLines = doc.splitTextToSize(text, 520);
    let cursor = 80;
    bodyLines.forEach((line) => {
      if (cursor > 760) {
        doc.addPage();
        cursor = 40;
      }
      doc.text(line, 40, cursor);
      cursor += 14;
    });
    doc.save(`meeting-${meeting.meetingKey}.pdf`);
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-gray-900 text-white flex flex-col m-0 p-0 overflow-hidden">
      {/* Header with buttons */}
      <header className="w-full flex items-center justify-between gap-4 py-3 border-b border-gray-800 px-2 sm:px-4">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onBack} className="py-2">
            Back
          </Button>
          <Button variant="secondary" onClick={downloadTranscript} className="py-2">
            Download Transcript
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if ('clipboard' in navigator) {
                navigator.clipboard.writeText(meeting.meetingKey).catch(() => {});
              }
            }}
            className="py-2"
          >
            Copy Key
          </Button>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3">
            {status === 'IN_PROGRESS' && (
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-red-500" />
                <span className="text-sm font-semibold">LIVE</span>
              </div>
            )}
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Status</p>
              <p className="text-sm font-semibold">{statusLabel}</p>
            </div>
          </div>
        </div>

        <div className="text-xs font-mono text-gray-400 truncate max-w-[28%] text-right">
          Key: {meeting.meetingKey}
        </div>
      </header>

      {/* Main area, full-screen transcript */}
      <main className="flex-1 w-full flex flex-col m-0 p-0 overflow-hidden">
        {/* Meeting info bar */}
        <div className="w-full border-b border-gray-800 px-2 sm:px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Meeting With</p>
            <p className="text-lg font-semibold text-white truncate">{meeting.studentName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-400">Technology</p>
            <p className="text-sm font-semibold">{meeting.technology}</p>
            <p className="text-xs text-gray-500 mt-1">
              Scheduled:{' '}
              {meeting.scheduledAt ? new Date(meeting.scheduledAt).toLocaleString() : 'TBD'}
            </p>
          </div>
        </div>

        {error && (
          <div className="w-full px-2 sm:px-4 py-2 text-xs text-red-400 border-b border-gray-800">
            {error}
          </div>
        )}

        {/* Transcript: edge to edge */}
        <section className="flex-1 w-full m-0 p-0 overflow-y-auto bg-black/40 font-mono text-sm">
          <div className="w-full m-0 p-3 space-y-3">
            {lines.length === 0 ? (
              <p className="text-gray-600 italic">Waiting for transcript...</p>
            ) : (
              lines.map((line, idx) => {
                const prev = idx > 0 ? lines[idx - 1] : null;
                const prevTime = prev ? new Date(prev.timestamp).getTime() : null;
                const currTime = new Date(line.timestamp).getTime();
                const isParagraphBreak =
                  prevTime !== null && currTime - prevTime > 3000; // > 3s gap

                return (
                  <div
                    key={`${line.timestamp}-${idx}`}
                    className={
                      'w-full flex items-start justify-between gap-3' +
                      (isParagraphBreak ? ' mt-4 pt-2 border-t border-gray-800' : '')
                    }
                  >
                    <div className="flex-1 break-words">
                      {line.from && (
                        <span className="text-xs text-gray-400 mr-2">{line.from}:</span>
                      )}
                      <span className="text-gray-100">{line.text}</span>
                    </div>
                    <div className="shrink-0 ml-4 text-[10px] text-gray-500 whitespace-nowrap">
                      {new Date(line.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                );
              })
            )}
            <div className="h-6" />
          </div>
        </section>
      </main>
    </div>
  );
};
