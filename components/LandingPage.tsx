import React, { useEffect, useState } from 'react';
import { Button } from './Button';
import { Header } from './Header';
import { Footer } from './Footer';
import { AppState } from '../types';
import { getSupportContact } from '../services/backendApi';

interface LandingPageProps {
  onLogin: () => void;
  onNavigate: (state: AppState) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onNavigate }) => {
  const [supportPhone, setSupportPhone] = useState('4567892345');

  useEffect(() => {
    let active = true;
    getSupportContact()
      .then((phone) => {
        if (!active) return;
        if (phone) setSupportPhone(phone);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent?.detail) {
        setSupportPhone(customEvent.detail);
      }
    };
    window.addEventListener('supportPhoneUpdated', handler);
    return () => window.removeEventListener('supportPhoneUpdated', handler);
  }, []);

  const contactNumber = supportPhone || '4567892345';
  const sanitizedNumber = contactNumber.replace(/\D/g, '') || '4567892345';
  const whatsappLink = `https://wa.me/${sanitizedNumber}`;
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 relative overflow-x-hidden text-white font-sans selection:bg-blue-500/30">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <Header onNavigate={onNavigate} onLogin={onLogin} />

      <main className="flex-1 flex flex-col items-center justify-center z-10 px-6 py-12 md:py-20 w-full">
        <div className="text-center max-w-5xl mx-auto">
            <div className="mb-8 inline-flex items-center justify-center p-2 px-4 bg-blue-500/10 rounded-full border border-blue-400/30 backdrop-blur-sm">
            <span className="text-blue-300 text-sm font-medium tracking-wide uppercase">AI-Powered Assistant</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-gray-400 tracking-tight leading-tight">
            Ace Your Interview <br className="hidden md:block"/> in Real-Time
            </h1>
            
            <p className="text-xl text-gray-400 mb-10 leading-relaxed max-w-2xl mx-auto">
            Your personal copilot that listens, understands, and whispers the perfect answers when you need them most.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
            <Button onClick={onLogin} className="text-lg px-8 py-4 shadow-xl shadow-blue-500/20">
                Start Interview Session
            </Button>
            <Button variant="secondary" onClick={() => onNavigate(AppState.HOW_IT_WORKS)} className="text-lg px-8 py-4 border-gray-600 bg-gray-800/50 hover:bg-gray-800">
                How It Works
            </Button>
            </div>

            <div className="flex justify-center items-center gap-2 text-sm text-gray-400 mb-10">
              <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12.04 2C6.49 2 2 6.48 2 12.02c0 1.93.52 3.72 1.43 5.26L2 22l4.94-1.35A9.987 9.987 0 0 0 12.04 22c5.54 0 10.04-4.48 10.04-9.98C22.08 6.48 17.58 2 12.04 2zm5.53 13.37c-.23.64-1.33 1.22-1.84 1.31-.49.08-1.11.14-1.7-.14-.96-.44-2-1.03-3.11-2.15-1.1-1.12-1.67-2.08-2.12-3.04-.3-.67.21-1.19.66-1.25.44-.05 1.37-.05 1.97.55.6.6.87 1.08 1.08 1.45.23.4.15.8.04.95-.12.17-.43.42-.69.64-.25.21-.5.44-.27.85.23.4 1.1 1.81 2.37 3.27 1.44 1.66 2.66 2.33 3.07 2.59.4.26.64.22.94.13.3-.09 1.84-.79 2.1-1.38.26-.6.26-1.11.18-1.21-.06-.1-.2-.16-.43-.28z" />
              </svg>
              <a href={whatsappLink} target="_blank" rel="noreferrer" className="text-sm font-semibold text-white hover:text-blue-100">
                WhatsApp support: {contactNumber}
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="glass-panel p-6 rounded-xl border border-gray-700/50 hover:border-blue-500/30 transition-colors group">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </div>
                <h3 className="text-white font-bold mb-2">Real-time Transcription</h3>
                <p className="text-sm text-gray-400">Advanced speech recognition listens to the interviewer so you can focus on your delivery.</p>
            </div>
            <div className="glass-panel p-6 rounded-xl border border-gray-700/50 hover:border-blue-500/30 transition-colors group">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                     <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h3 className="text-white font-bold mb-2">Context Aware</h3>
                <p className="text-sm text-gray-400">Generates answers tailored specifically to your uploaded Resume and the Job Description.</p>
            </div>
            <div className="glass-panel p-6 rounded-xl border border-gray-700/50 hover:border-blue-500/30 transition-colors group">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="text-white font-bold mb-2">Instant Hints</h3>
                <p className="text-sm text-gray-400">Press <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-white text-xs border border-gray-600">Space</kbd> for a high-impact answer in seconds.</p>
            </div>
            </div>
        </div>
      </main>

      <a
        href={whatsappLink}
        target="_blank"
        rel="noreferrer"
        className="fixed left-4 bottom-4 z-40 w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/40 hover:scale-105 transition-transform"
      >
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none">
          <path
            d="M17.472 14.382a5.6 5.6 0 01-2.048.904c-.551.142-1.053.214-1.612.214-1.125 0-2.157-.25-3.036-.701a6.17 6.17 0 01-2.724-2.556c-.984-1.708-.81-3.84.39-5.473A5.41 5.41 0 0110.89 5.9c1.594-.58 3.395-.364 4.74.566.923.63 1.698 1.547 2.144 2.606.447 1.058.522 2.22.213 3.33-.163.58-.31.933-.41 1.21z"
            fill="currentColor"
          />
          <path
            d="M12.89 2.5a9.508 9.508 0 00-6.718 2.869 9.488 9.488 0 00-2.79 6.729c0 1.608.404 3.195 1.17 4.6L2 22l6.505-1.684c1.363.878 2.888 1.338 4.444 1.338h.004c5.24 0 9.5-4.26 9.5-9.5S18.13 2.5 12.89 2.5z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
      <Footer onNavigate={onNavigate} />
    </div>
  );
};
