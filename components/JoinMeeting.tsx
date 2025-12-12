import React, { useState } from 'react';
import { Meeting } from '../types';
import { joinMeeting } from '../services/backendApi';
import { Button } from './Button';

interface JoinMeetingProps {
  onJoined: (meeting: Meeting) => void;
  onCancel: () => void;
}

export const JoinMeeting: React.FC<JoinMeetingProps> = ({ onJoined, onCancel }) => {
  const [meetingKey, setMeetingKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!meetingKey.trim()) {
      setError('Meeting key is required');
      return;
    }
    setLoading(true);
    try {
      const meeting = await joinMeeting(meetingKey);
      onJoined(meeting);
    } catch (err: any) {
      console.error('Join meeting failed', err);
      setError(err.message || 'Unable to join meeting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md glass-panel border border-gray-700 rounded-2xl p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Join Mentor Meeting</h1>
          <p className="text-sm text-gray-400 mt-2">
            Enter the meeting key shared by your mentor to connect to the live transcript.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs uppercase font-semibold text-gray-400">Meeting Key</label>
            <input
              type="text"
              className="w-full mt-2 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. MT-AB1234"
              value={meetingKey}
              onChange={(e) => setMeetingKey(e.target.value.toUpperCase())}
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex flex-col gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Joining…' : 'Join Meeting'}
            </Button>
            <Button variant="secondary" type="button" onClick={onCancel}>
              Back to Dashboard
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
