import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { AppState } from '../types';

interface PageProps {
  onLogin: () => void;
  onNavigate: (state: AppState) => void;
  onBack?: () => void;
}

export const FeaturesPage: React.FC<PageProps> = ({ onLogin, onNavigate, onBack }) => {
  const features = [
    {
      title: "Real-Time Transcription",
      desc: "Our engine listens to the interview in real-time with high accuracy, ensuring no context is lost.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
      )
    },
    {
      title: "Contextual Awareness",
      desc: "Upload your Resume and the Job Description (JD). The AI tailors every answer to bridge your skills with the job requirements.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      )
    },
    {
      title: "Instant Response Generation",
      desc: "Stuck? Just press 'Space'. We generate concise, punchy answers in milliseconds.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
      )
    },
    {
      title: "Customizable Tone",
      desc: "Choose your persona: Professional, Friendly, Technical, or Concise. You control how you sound.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
      )
    },
    {
      title: "Stealth Mode",
      desc: "Designed to be unobtrusive. The interface is optimized for split-screen use so you can maintain eye contact.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
      )
    },
    {
      title: "Secure & Private",
      desc: "Your data is processed ephemerally. We do not store your resume or audio recordings after the session.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
      )
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white font-sans">
      <Header onNavigate={onNavigate} onLogin={onLogin} onBack={onBack} />
      
      <main className="flex-1 max-w-7xl mx-auto px-6 py-20 w-full">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Features built for <span className="text-blue-400">Success</span></h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">Everything you need to confidently crush your technical and behavioral interviews.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div key={idx} className="glass-panel p-8 rounded-2xl border border-gray-800 hover:border-blue-500/50 transition-all duration-300 group">
              <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors text-blue-400 group-hover:text-white">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <Footer onNavigate={onNavigate} />
    </div>
  );
};