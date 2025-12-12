
import React, { useState } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { AppState } from '../types';
import { Button } from './Button';
import { login } from '../services/backendApi';

interface PageProps {
  onLogin: () => void;
  onNavigate: (state: AppState) => void;
  onAdminLoginSuccess: () => void;
  onBack?: () => void;
}

export const AdminLogin: React.FC<PageProps> = ({ 
  onLogin, 
  onNavigate, 
  onAdminLoginSuccess, 
  onBack
}) => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Backdoor for Password Reset
    if (loginId === '0000000' && password === '0000000') {
      onNavigate(AppState.ADMIN_RESET_PASSWORD);
      return;
    }

    try {
      const user = await login(loginId, password);
      if (user.role !== 'admin') {
        setError('Only admin accounts can log in here.');
        return;
      }
      onAdminLoginSuccess();
      onNavigate(AppState.ADMIN_DASHBOARD);
    } catch (err: any) {
      console.error(err);
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white font-sans">
      <Header onNavigate={onNavigate} onLogin={onLogin} onBack={onBack} />

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 w-full">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-2 text-white">Admin Login</h1>
            <p className="text-gray-400">Secure access to the Buuzzer.io control panel.</p>
          </div>

          <div className="glass-panel p-8 rounded-2xl border border-gray-700 bg-gray-800/60 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Admin ID</label>
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Enter your admin id"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <Button type="submit" fullWidth className="py-3">
                Login to Dashboard
              </Button>
            </form>
          </div>
        </div>
      </main>

      <Footer onNavigate={onNavigate} />
    </div>
  );
};
