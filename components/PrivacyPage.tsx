import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { AppState } from '../types';

interface PageProps {
  onLogin: () => void;
  onNavigate: (state: AppState) => void;
  onBack?: () => void;
}

export const PrivacyPage: React.FC<PageProps> = ({ onLogin, onNavigate, onBack }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white font-sans">
      <Header onNavigate={onNavigate} onLogin={onLogin} onBack={onBack} />
      
      <main className="flex-1 max-w-4xl mx-auto px-6 py-20 w-full">
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-4 text-blue-400">Privacy Policy</h1>
          <p className="text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          <section className="glass-panel p-8 rounded-xl">
            <h2 className="text-xl font-bold text-white mb-4">1. Information We Collect</h2>
            <p className="mb-4">
              At Buuzzer.io, we prioritize your privacy. We collect minimal information necessary to provide our services:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Input Data:</strong> Resumes and Job Descriptions you paste into the application.</li>
              <li><strong>Audio Data:</strong> Real-time audio captured during the interview session for transcription purposes.</li>
              <li><strong>Usage Data:</strong> Basic analytics to improve application performance.</li>
            </ul>
          </section>

          <section className="glass-panel p-8 rounded-xl">
            <h2 className="text-xl font-bold text-white mb-4">2. How We Use Your Information</h2>
            <p>
              Your data is used exclusively to generate real-time interview assistance. 
              <span className="text-blue-300 font-semibold"> We do not store your resume, job descriptions, or audio recordings on our servers after the session ends.</span> 
              All processing is done ephemerally.
            </p>
          </section>

          <section className="glass-panel p-8 rounded-xl">
            <h2 className="text-xl font-bold text-white mb-4">3. Data Security</h2>
            <p>
              We employ industry-standard security measures to protect your data during transmission. However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section className="glass-panel p-8 rounded-xl">
            <h2 className="text-xl font-bold text-white mb-4">4. Third-Party Services</h2>
            <p>
              We utilize Google Gemini API for generating responses. Please review Google's privacy policy to understand how they handle data processed through their APIs.
            </p>
          </section>
        </div>
      </main>

      <Footer onNavigate={onNavigate} />
    </div>
  );
};