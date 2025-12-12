import React, { useState } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { AppState } from '../types';
import { Button } from './Button';
import { resetAdminCredentials } from '../services/backendApi';

interface PageProps {
  onNavigate: (state: AppState) => void;
  onBack?: () => void;
}

export const AdminResetPassword: React.FC<PageProps> = ({ onNavigate, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await resetAdminCredentials({
        loginId: username.trim(),
        password,
        name: username.trim(),
        resetKey: import.meta.env.VITE_ADMIN_RESET_KEY ?? '0000000'
      });
      setStatusMessage('Admin credentials updated. Please login with the new credentials.');
      setCompleted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to update admin credentials');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white font-sans">
      <Header onNavigate={onNavigate} onLogin={() => onNavigate(AppState.USER_LOGIN)} onBack={onBack} />
      
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 w-full">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
               <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h1 className="text-3xl font-bold mb-2 text-white">Reset Admin Access</h1>
            <p className="text-gray-400">Set new credentials for the administrator account.</p>
          </div>

          <div className="glass-panel p-8 rounded-2xl border border-red-900/50">
            {completed ? (
              <div className="space-y-4 text-center">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/40 rounded text-emerald-200 text-sm font-medium">
                  {statusMessage}
                </div>
                <Button onClick={() => onNavigate(AppState.ADMIN_LOGIN)} fullWidth className="py-3 bg-emerald-600 hover:bg-emerald-500">
                  Back to Admin Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm text-center">
                    {error}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">New Username</label>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={saving}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" 
                    placeholder="e.g. admin"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">New Password</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={saving}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" 
                    placeholder="New password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Confirm Password</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={saving}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" 
                    placeholder="Confirm password"
                  />
                </div>

                <Button type="submit" fullWidth disabled={saving} className="py-3 bg-red-600 hover:bg-red-500">
                  {saving ? 'Updating...' : 'Update Credentials'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer onNavigate={onNavigate} />
    </div>
  );
};
