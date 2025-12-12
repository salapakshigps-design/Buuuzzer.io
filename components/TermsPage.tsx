import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { AppState } from '../types';

interface PageProps {
  onLogin: () => void;
  onNavigate: (state: AppState) => void;
  onBack?: () => void;
}

export const TermsPage: React.FC<PageProps> = ({ onLogin, onNavigate, onBack }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white font-sans">
      <Header onNavigate={onNavigate} onLogin={onLogin} onBack={onBack} />
      
      <main className="flex-1 max-w-4xl mx-auto px-6 py-20 w-full">
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-4 text-blue-400">Terms of Service</h1>
          <p className="text-gray-400">Effective Date: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          <section className="glass-panel p-8 rounded-xl">
            <h2 className="text-xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Buuzzer.io, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use our service.
            </p>
          </section>

          <section className="glass-panel p-8 rounded-xl">
            <h2 className="text-xl font-bold text-white mb-4">2. Use License</h2>
            <p className="mb-4">
              Permission is granted to temporarily use Buuzzer.io for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
            </p>
            <p>You may not:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
              <li>Modify or copy the materials;</li>
              <li>Use the materials for any commercial purpose;</li>
              <li>Attempt to decompile or reverse engineer any software contained on Buuzzer.io;</li>
            </ul>
          </section>

          <section className="glass-panel p-8 rounded-xl">
            <h2 className="text-xl font-bold text-white mb-4">3. Disclaimer</h2>
            <p>
              The materials on Buuzzer.io are provided on an 'as is' basis. Buuzzer.io makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property.
            </p>
            <p className="mt-4 text-yellow-500/80">
              Buuzzer.io is an AI assistant. Users should verify all generated information before using it in a professional setting. We are not responsible for the outcome of your interviews.
            </p>
          </section>

          <section className="glass-panel p-8 rounded-xl">
            <h2 className="text-xl font-bold text-white mb-4">4. Limitations</h2>
            <p>
              In no event shall Buuzzer.io or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Buuzzer.io.
            </p>
          </section>
        </div>
      </main>

      <Footer onNavigate={onNavigate} />
    </div>
  );
};