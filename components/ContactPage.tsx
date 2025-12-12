import React, { useState } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { AppState } from '../types';
import { Button } from './Button';
import { submitContactForm } from '../services/backendApi';

interface PageProps {
  onLogin: () => void;
  onNavigate: (state: AppState) => void;
  onBack?: () => void;
}

export const ContactPage: React.FC<PageProps> = ({ onLogin, onNavigate, onBack }) => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showWhatsapp, setShowWhatsapp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('General Inquiry');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMessage(null);
    try {
      await submitContactForm({ name, email, subject, message });
      setSubmitted(true);
      setStatusMessage('Thank you! Your message has been received.');
    } catch (err: any) {
      console.error(err);
      setStatusMessage(err.message || 'Failed to send message, please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white font-sans">
      <Header onNavigate={onNavigate} onLogin={onLogin} onBack={onBack} />
      
      <main className="flex-1 max-w-3xl mx-auto px-6 py-20 w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-4 text-blue-400">Contact Support</h1>
          <p className="text-gray-400">Have questions or need help? Reach out to the Buuzzer.io team.</p>
        </div>

        {submitted ? (
          <div className="glass-panel p-10 rounded-2xl text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-2xl font-bold mb-2">Message Sent!</h3>
            <p className="text-gray-400 mb-2">Thank you for contacting us. We will get back to you shortly.</p>
            <p className="text-gray-500 text-sm mb-4">{statusMessage}</p>
            <Button onClick={() => onNavigate(AppState.LANDING)} variant="secondary">Back to Home</Button>
          </div>
        ) : (
          <div className="glass-panel p-8 rounded-2xl border border-gray-700">
            <form onSubmit={handleSubmit} className="space-y-6">
              {statusMessage && (
                <div className="text-sm text-center text-yellow-300">
                  {statusMessage}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  <option>General Inquiry</option>
                  <option>Technical Support</option>
                  <option>Billing Question</option>
                  <option>Feature Request</option>
                  <option>Feedback</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Message</label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                  placeholder="How can we help you?"
                ></textarea>
              </div>

              <Button type="submit" fullWidth className="py-4 text-lg" disabled={submitting}>
                {submitting ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </div>
        )}

        <div className="mt-12 text-center text-gray-500 text-sm space-y-2">
          <p>Or email us directly at <a href="mailto:support@buuzzer.io" className="text-blue-400 hover:underline">support@buuzzer.io</a></p>
          <button
            type="button"
            onClick={() => setShowWhatsapp((prev) => !prev)}
            className="flex items-center justify-center gap-2 text-blue-300 hover:text-white"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12.04 2C6.49 2 2 6.48 2 12.02c0 1.93.52 3.72 1.43 5.26L2 22l4.94-1.35A9.987 9.987 0 0 0 12.04 22c5.54 0 10.04-4.48 10.04-9.98C22.08 6.48 17.58 2 12.04 2zm5.53 13.37c-.23.64-1.33 1.22-1.84 1.31-.49.08-1.11.14-1.7-.14-.96-.44-2-1.03-3.11-2.15-1.1-1.12-1.67-2.08-2.12-3.04-.3-.67.21-1.19.66-1.25.44-.05 1.37-.05 1.97.55.6.6.87 1.08 1.08 1.45.23.4.15.8.04.95-.12.17-.43.42-.69.64-.25.21-.5.44-.27.85.23.4 1.1 1.81 2.37 3.27 1.44 1.66 2.66 2.33 3.07 2.59.4.26.64.22.94.13.3-.09 1.84-.79 2.1-1.38.26-.6.26-1.11.18-1.21-.06-.1-.2-.16-.43-.28z" />
            </svg>
            <span>{showWhatsapp ? '4567892345' : 'WhatsApp Support'}</span>
          </button>
        </div>
      </main>

      <Footer onNavigate={onNavigate} />
    </div>
  );
};
