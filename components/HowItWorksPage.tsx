import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { AppState } from '../types';
import { Button } from './Button';

interface PageProps {
  onLogin: () => void;
  onNavigate: (state: AppState) => void;
  onBack?: () => void;
}

export const HowItWorksPage: React.FC<PageProps> = ({ onLogin, onNavigate, onBack }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white font-sans">
      <Header onNavigate={onNavigate} onLogin={onLogin} onBack={onBack} />
      
      <main className="flex-1 max-w-7xl mx-auto px-6 py-20 w-full flex flex-col items-center">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">How it <span className="text-blue-400">Works</span></h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">From setup to success in 4 simple steps.</p>
        </div>

        <div className="space-y-12 max-w-4xl relative">
          {/* Vertical Line */}
          <div className="absolute left-[28px] top-0 bottom-0 w-0.5 bg-gray-800 md:left-1/2 md:-translate-x-1/2 z-0"></div>

          {/* Step 1 */}
          <div className="relative flex flex-col md:flex-row items-center md:justify-between gap-8 z-10">
            <div className="md:w-1/2 md:text-right order-2 md:order-1">
              <h3 className="text-2xl font-bold text-white mb-2">Login & Setup</h3>
              <p className="text-gray-400">Create an account and access your dashboard. It takes less than a minute.</p>
            </div>
            <div className="w-14 h-14 bg-blue-600 rounded-full border-4 border-gray-900 flex items-center justify-center text-xl font-bold order-1 md:order-2 shrink-0 shadow-lg shadow-blue-900/50">1</div>
            <div className="md:w-1/2 order-3 md:order-3"></div>
          </div>

          {/* Step 2 */}
          <div className="relative flex flex-col md:flex-row items-center md:justify-between gap-8 z-10">
            <div className="md:w-1/2 order-3 md:order-1"></div>
            <div className="w-14 h-14 bg-gray-800 rounded-full border-4 border-gray-900 flex items-center justify-center text-xl font-bold order-1 md:order-2 shrink-0 text-blue-400">2</div>
            <div className="md:w-1/2 order-2 md:order-3">
              <h3 className="text-2xl font-bold text-white mb-2">Upload Context</h3>
              <p className="text-gray-400">Paste your Resume and the Job Description. This is the "brain" for your answers.</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative flex flex-col md:flex-row items-center md:justify-between gap-8 z-10">
            <div className="md:w-1/2 md:text-right order-2 md:order-1">
              <h3 className="text-2xl font-bold text-white mb-2">Configure Style</h3>
              <p className="text-gray-400">Set your preferred response length and tone (e.g., "Short & Professional").</p>
            </div>
            <div className="w-14 h-14 bg-gray-800 rounded-full border-4 border-gray-900 flex items-center justify-center text-xl font-bold order-1 md:order-2 shrink-0 text-blue-400">3</div>
            <div className="md:w-1/2 order-3 md:order-3"></div>
          </div>

          {/* Step 4 */}
          <div className="relative flex flex-col md:flex-row items-center md:justify-between gap-8 z-10">
            <div className="md:w-1/2 order-3 md:order-1"></div>
            <div className="w-14 h-14 bg-gray-800 rounded-full border-4 border-gray-900 flex items-center justify-center text-xl font-bold order-1 md:order-2 shrink-0 text-blue-400">4</div>
            <div className="md:w-1/2 order-2 md:order-3">
              <h3 className="text-2xl font-bold text-white mb-2">Ace the Interview</h3>
              <p className="text-gray-400">Launch the live session. When asked a tough question, hit Spacebar and read the answer.</p>
            </div>
          </div>
        </div>

        <div className="mt-20">
             <Button onClick={onLogin} className="px-10 py-4 text-lg">Get Started Now</Button>
        </div>
      </main>

      <Footer onNavigate={onNavigate} />
    </div>
  );
};