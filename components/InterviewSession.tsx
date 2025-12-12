import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserPreferences, InterviewResponse } from '../types';
import { generateInterviewResponse as generateGemini } from '../services/geminiService';
import { generateInterviewResponse as generateOpenAI } from '../services/openaiService';
import { generateInterviewResponse as generateDeepSeek } from '../services/deepseekService';
import { getDeepgramKey, recordSessionUsage } from '../services/backendApi';
import { Button } from './Button';

interface InterviewSessionProps {
  preferences: UserPreferences;
  onEndSession: () => void;
}

export const InterviewSession: React.FC<InterviewSessionProps> = ({ preferences, onEndSession }) => {
  const [transcript, setTranscript] = useState<string>("");
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [responses, setResponses] = useState<InterviewResponse[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deepgramKey, setDeepgramKey] = useState<string | null>(null);
  const [currentAccumulatedSeconds, setCurrentAccumulatedSeconds] = useState<number>(
    preferences.sessionSecondsUsed || 0
  );
  const sessionStartRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const sessionEndedRef = useRef(false);
  const latestSecondsRef = useRef(preferences.sessionSecondsUsed || 0);
  const sessionDurationSeconds = (preferences.durationMinutes || 0) * 60;
  const preferencesRef = useRef(preferences);
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);
  const onEndSessionRef = useRef(onEndSession);
  useEffect(() => {
    onEndSessionRef.current = onEndSession;
  }, [onEndSession]);

  const transcriptRef = useRef<string>(""); 
  const bottomRef = useRef<HTMLDivElement>(null);
  const responseContainerRef = useRef<HTMLDivElement>(null);
  
  // Media Recorder and WebSocket Refs for Deepgram
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let active = true;
    const loadKey = async () => {
      try {
        const key = await getDeepgramKey();
        if (!active) return;
        setDeepgramKey(key);
      } catch (err: any) {
        console.error('Failed to load Deepgram key', err);
        if (active) {
          setErrorMsg("Deepgram API Key is missing. Please configure it in the Admin Dashboard.");
        }
      }
    };

    loadKey();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!deepgramKey) return;

    const startDeepgram = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        let mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
           if (MediaRecorder.isTypeSupported('audio/mp4')) {
             mimeType = 'audio/mp4'; // Safari support
           } else {
             setErrorMsg("Browser not supported (requires audio/webm or audio/mp4).");
             return;
           }
        }

        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;

        // Initialize WebSocket to Deepgram
        const socket = new WebSocket('wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=true', [
            'token',
            deepgramKey,
        ]);
        socketRef.current = socket;

        socket.onopen = () => {
          console.log("Deepgram connected");
          setIsListening(true);
          mediaRecorder.addEventListener('dataavailable', (event) => {
            if (event.data.size > 0 && socket.readyState === 1) {
              socket.send(event.data);
            }
          });
          mediaRecorder.start(250);
        };

        socket.onmessage = (message) => {
          const received = JSON.parse(message.data);
          const transcriptPart = received.channel?.alternatives?.[0]?.transcript;
          
          if (transcriptPart) {
            if (received.is_final) {
              setTranscript((prev) => {
                const updated = prev + " " + transcriptPart;
                transcriptRef.current = updated;
                return updated;
              });
              setInterimTranscript(""); // Clear interim once finalized
            } else {
              setInterimTranscript(transcriptPart);
            }
          }
        };

        socket.onclose = () => {
           console.log("Deepgram disconnected");
           setIsListening(false);
        };

        socket.onerror = (error) => {
           console.error("Deepgram WebSocket Error", error);
           setErrorMsg("Connection to Deepgram failed. Check API Key.");
        };

      } catch (err: any) {
        console.error("Microphone Error:", err);
        setErrorMsg("Could not access microphone. " + err.message);
      }
    };

    startDeepgram();

    return () => {
      if (socketRef.current) socketRef.current.close();
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    };
  }, [deepgramKey]);

  const finalizeSession = useCallback(
    async (reason?: string, totalOverride?: number) => {
      if (sessionEndedRef.current) return;
      sessionEndedRef.current = true;

      if (socketRef.current) socketRef.current.close();
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const totalSecondsValue =
        typeof totalOverride === 'number' ? totalOverride : latestSecondsRef.current;
      const currentPreferences = preferencesRef.current;
      const durationSecondsValue = (currentPreferences.durationMinutes || 0) * 60;
      const actualTotal =
        durationSecondsValue > 0
          ? Math.min(totalSecondsValue, durationSecondsValue)
          : totalSecondsValue;
      const delta = Math.max(
        0,
        actualTotal - (currentPreferences.sessionSecondsUsed || 0)
      );

      if (delta > 0) {
        try {
          await recordSessionUsage(currentPreferences.interviewId, delta);
          window.dispatchEvent(new CustomEvent('sessionUpdated'));
        } catch (err) {
          console.error('Failed to record session usage', err);
        }
      }

      if (reason) {
        setErrorMsg(reason);
      }

      onEndSessionRef.current?.();
    },
    [sessionDurationSeconds]
  );

  useEffect(() => {
    if (!deepgramKey) return;
    sessionStartRef.current = Date.now();
    sessionEndedRef.current = false;
    latestSecondsRef.current = preferences.sessionSecondsUsed || 0;
    setCurrentAccumulatedSeconds(latestSecondsRef.current);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    const intervalId = window.setInterval(() => {
      const start = sessionStartRef.current;
      if (!start) return;
      const delta = Math.floor((Date.now() - start) / 1000);
      const total = latestSecondsRef.current + delta;
      latestSecondsRef.current = total;
      setCurrentAccumulatedSeconds(total);
      if (sessionDurationSeconds > 0 && total >= sessionDurationSeconds) {
        finalizeSession("Session duration completed", total);
      }
    }, 1000);
    timerRef.current = intervalId;
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [deepgramKey, finalizeSession, sessionDurationSeconds, preferences.sessionSecondsUsed]);

  const isSessionExpired =
    sessionDurationSeconds > 0 && currentAccumulatedSeconds >= sessionDurationSeconds;

  // Auto scroll transcript
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, interimTranscript]);

  const handleGenerateResponse = useCallback(async () => {
    // Combine finalized and interim transcript
    const fullTranscript = (transcriptRef.current + " " + interimTranscript).trim();
    
    if (!fullTranscript || fullTranscript.length < 5) return;
    if (isSessionExpired) {
      setErrorMsg("Session duration completed.");
      return;
    }

    // CLEAR TRANSCRIPT STATE IMMEDIATELY
    // This ensures the next question starts on a clean slate
    setTranscript("");
    transcriptRef.current = "";
    setInterimTranscript("");
    
    const newId = Date.now().toString();
    const newEntry: InterviewResponse = {
      id: newId,
      // Show the actual captured text as context, truncated if too long
      questionContext: fullTranscript.length > 150 ? fullTranscript.slice(0, 150) + "..." : fullTranscript, 
      answer: "Generating response...",
      timestamp: new Date(),
      isLoading: true
    };

    // Add new entry to UI immediately (as loading)
    setResponses((prev) => [newEntry, ...prev]);

    // Choose the provider based on preference
    let answer = "";
    const provider = preferences.aiProvider || 'GEMINI'; // Default to Gemini
    
    console.log(`Generating response using provider: ${provider}`);

    try {
      if (provider === 'OPENAI') {
        answer = await generateOpenAI(fullTranscript, preferences, responses);
      } else if (provider === 'DEEPSEEK') {
        answer = await generateDeepSeek(fullTranscript, preferences, responses);
      } else {
        // GEMINI
        answer = await generateGemini(fullTranscript, preferences, responses);
      }
    } catch (e: any) {
      console.error("Error generating response", e);
      answer = `Error: ${e.message || "Failed to generate response"}`;
    }

    setResponses((prev) => 
      prev.map(r => r.id === newId ? { ...r, answer, isLoading: false } : r)
    );

  }, [preferences, interimTranscript, responses, isSessionExpired]);

  // Key Listener for Space/Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault(); 
          handleGenerateResponse();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGenerateResponse]);

  const handleManualEnd = () => {
    finalizeSession();
  };

  return (
    <div className="h-screen w-full flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center space-x-2">
           <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
           <span className="font-mono text-sm text-gray-300">{isListening ? 'LISTENING (Deepgram)' : 'PAUSED'}</span>
        </div>
        <div className="flex items-center space-x-4">
           <span className="text-xs text-gray-500 hidden sm:inline">Press <span className="text-white font-bold">SPACE</span> for AI Answer</span>
           <div className="flex items-center gap-2">
             <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-800 px-2 py-1 rounded border border-gray-700">
               {preferences.aiProvider || 'GEMINI'}
             </span>
             <Button variant="danger" className="py-1 px-3 text-sm h-8" onClick={handleManualEnd}>End Session</Button>
           </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* LEFT/TOP: Responses (70%) */}
        <div className="flex-1 md:flex-[7] bg-gray-900/50 flex flex-col overflow-hidden relative">
           <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-gray-900/50 to-transparent z-10 pointer-events-none"></div>
           
           <div 
             className="flex-1 overflow-y-auto p-6 space-y-6"
             ref={responseContainerRef}
           >
              {responses.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-600">
                  <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p>Waiting for trigger...</p>
                  <p className="text-sm mt-2">When the interviewer asks a question, press Space or use the button.</p>
                </div>
              )}

              {responses.map((resp) => (
                <div key={resp.id} className="w-full animate-in fade-in slide-in-from-top-4 duration-300">
                   <div className={`rounded-xl p-5 border ${resp.isLoading ? 'border-blue-500/50 bg-blue-900/10' : 'border-gray-700 bg-gray-800'} shadow-lg`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
                          Question Captured: {resp.questionContext}
                        </span>
                        <span className="text-xs text-gray-600">
                          {resp.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="prose prose-invert max-w-none">
                        {resp.isLoading ? (
                           <div className="flex space-x-2 items-center text-blue-300">
                              <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Thinking...</span>
                           </div>
                        ) : (
                          <p className="text-lg leading-relaxed text-blue-50 font-medium">
                            {resp.answer}
                          </p>
                        )}
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* RIGHT/BOTTOM: Transcript (30%) */}
        <div className="h-48 md:h-auto md:flex-[3] bg-black border-t md:border-t-0 md:border-l border-gray-800 flex flex-col shrink-0 relative">
           <div className="px-4 py-2 bg-gray-900/80 border-b border-gray-800 flex justify-between items-center">
             <span className="text-xs font-bold text-gray-400 uppercase">Live Transcript</span>
             <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500' : 'bg-red-500'}`}></span>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 font-mono text-sm text-gray-400 space-y-2 relative pb-20 md:pb-4">
             {errorMsg ? (
               <div className="text-red-400 p-2 border border-red-900 bg-red-900/20 rounded">
                 Error: {errorMsg}
               </div>
             ) : (
               <>
                <div className="min-h-[2rem]">
                  {transcript || interimTranscript ? (
                    <p className="whitespace-pre-wrap break-words">
                      {transcript}
                      <span className="text-gray-600 italic">{interimTranscript}</span>
                      {/* Visual cursor to indicate activity */}
                      <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse align-middle ml-1"></span>
                    </p>
                  ) : (
                    <p className="text-gray-700 italic">Listening for next question...</p>
                  )}
                </div>
                <div ref={bottomRef} />
               </>
             )}
           </div>

           {/* MANUAL TRIGGER BUTTON (Floating at bottom of transcript) */}
           <div className="absolute bottom-4 left-0 w-full px-4 flex justify-center z-10 pointer-events-none">
              <Button 
                onClick={handleGenerateResponse}
                disabled={isSessionExpired}
                className="pointer-events-auto shadow-xl shadow-blue-500/20 flex items-center gap-2 border border-blue-400/30 backdrop-blur-md bg-blue-600/90 hover:bg-blue-500 py-3 px-6 rounded-full w-full md:w-auto justify-center md:justify-start"
              >
                <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <span className="font-bold">Generate Answer</span>
              </Button>
           </div>
        </div>

      </div>
    </div>
  );
};
