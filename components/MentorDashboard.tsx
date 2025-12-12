import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Meeting, User } from '../types';
import { Button } from './Button';
import { createMeeting, listMyMeetings, updatePendingMeeting } from '../services/backendApi';

const toDateTimeLocalInput = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => value.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getMinDateTime = () => toDateTimeLocalInput(new Date().toISOString());

interface MentorDashboardProps {
  currentUser: User;
  onLogout: () => void;
  onBack?: () => void;
  onOpenMeeting: (meeting: Meeting) => void;
}

export const MentorDashboard: React.FC<MentorDashboardProps> = ({
  currentUser,
  onLogout,
  onBack,
  onOpenMeeting,
}) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [technology, setTechnology] = useState('');
  const [studentName, setStudentName] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastMeetingKey, setLastMeetingKey] = useState<string | null>(null);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({
    technology: '',
    studentName: '',
    scheduledAt: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadMeetings = useCallback(async () => {
    setLoadingMeetings(true);
    try {
      const data = await listMyMeetings();
      setMeetings(data);
    } catch (err) {
      console.error('Failed to load meetings', err);
      setFormMessage('Failed to load your meetings');
    } finally {
      setLoadingMeetings(false);
      window.setTimeout(() => setFormMessage(null), 4000);
    }
  }, []);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const startEdit = (meeting: Meeting) => {
    setEditingMeetingId(meeting.id);
    setEditFields({
      technology: meeting.technology,
      studentName: meeting.studentName,
      scheduledAt: toDateTimeLocalInput(meeting.scheduledAt),
    });
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingMeetingId(null);
    setEditFields({ technology: '', studentName: '', scheduledAt: '' });
    setEditError(null);
  };

  const handleEditSave = async () => {
    if (!editingMeetingId) return;
    if (!editFields.technology.trim() || !editFields.studentName.trim() || !editFields.scheduledAt) {
      setEditError('All fields are required');
      return;
    }
    const selected = new Date(editFields.scheduledAt);
    if (Number.isNaN(selected.getTime())) {
      setEditError('Enter a valid date and time');
      return;
    }
    if (selected.getTime() < Date.now()) {
      setEditError('Please choose a future date and time');
      return;
    }
    setEditLoading(true);
    try {
      const updated = await updatePendingMeeting(editingMeetingId, {
        technology: editFields.technology.trim(),
        studentName: editFields.studentName.trim(),
        scheduledAt: selected.toISOString(),
      });
      setMeetings((prev) =>
        prev.map((meeting) => (meeting.id === updated.id ? updated : meeting))
      );
      setFormMessage(`Meeting updated for ${new Date(updated.scheduledAt).toLocaleString()}`);
      window.setTimeout(() => setFormMessage(null), 4000);
      cancelEdit();
    } catch (err: any) {
      console.error('Failed to update meeting', err);
      setEditError(err.message || 'Failed to update meeting');
    } finally {
      setEditLoading(false);
    }
  };

  const upcoming = useMemo(
    () => meetings.filter((meeting) => meeting.status !== 'COMPLETED'),
    [meetings]
  );
  const completed = useMemo(
    () => meetings.filter((meeting) => meeting.status === 'COMPLETED'),
    [meetings]
  );

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!technology.trim() || !studentName.trim() || !scheduledAt.trim()) {
      setFormMessage('All fields are required');
      return;
    }
    const scheduledDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      setFormMessage('Invalid date selected');
      return;
    }
    if (scheduledDate.getTime() < Date.now()) {
      setFormMessage('Please select a date and time in the future.');
      return;
    }
    setSubmitting(true);
    try {
      const meeting = await createMeeting({
        technology: technology.trim(),
        studentName: studentName.trim(),
        scheduledAt: scheduledDate.toISOString(),
      });
      setMeetings((prev) => [meeting, ...prev]);
      setTechnology('');
      setStudentName('');
      setScheduledAt('');
      setLastMeetingKey(meeting.meetingKey);
      setFormMessage(`Meeting created — key ${meeting.meetingKey}`);
    } catch (err: any) {
      console.error('Failed to create meeting', err);
      setFormMessage(err.message || 'Failed to create meeting');
    } finally {
      setSubmitting(false);
      window.setTimeout(() => setFormMessage(null), 4000);
    }
  };

  const formatStatus = (status: Meeting['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'Completed';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'PENDING':
        return 'Pending Approval';
      default:
        return status;
    }
  };

  const copyKey = (key: string) => {
    if ('clipboard' in navigator) {
      navigator.clipboard.writeText(key).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="w-full max-w-6xl mx-auto py-10 px-4 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Mentor Meeting Console</h1>
            <p className="text-gray-400 text-sm mt-1">
              Hi {currentUser.name || currentUser.loginId}, plan and run live meetings here.
            </p>
          </div>
          <div className="flex gap-3">
           
            <Button variant="danger" onClick={onLogout}>
              Logout
            </Button>
            <Button onClick={loadMeetings} disabled={loadingMeetings} variant="secondary">
              {loadingMeetings ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        </div>

        <form
          className="glass-panel p-6 rounded-2xl border border-gray-700 space-y-4"
          onSubmit={handleCreateMeeting}
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                Technology
              </label>
              <input
                type="text"
                value={technology}
                onChange={(e) => setTechnology(e.target.value)}
                placeholder="e.g. React + Node"
                className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                Student name
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Learner Name"
                className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="mentorMeetingScheduledAt"
              className="text-xs font-semibold text-gray-300 uppercase tracking-wide"
            >
              Date &amp; time
            </label>
            <input
              id="mentorMeetingScheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button type="submit" className="min-w-[150px]" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Meeting'}
            </Button>
            {lastMeetingKey && (
              <Button
                variant="secondary"
                type="button"
                onClick={() => copyKey(lastMeetingKey)}
              >
                Copy Key {lastMeetingKey}
              </Button>
            )}
          </div>
          {formMessage && <p className="text-xs text-emerald-300">{formMessage}</p>}
        </form>

        <div className="space-y-6">
          <section>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-semibold">Active & Scheduled Meetings</h2>
              <span className="text-xs text-gray-400 uppercase tracking-wide">
                {upcoming.length} total
              </span>
            </div>
            {upcoming.length === 0 ? (
              <div className="glass-panel p-6 rounded-2xl border border-dashed border-gray-700 text-center text-gray-400">
                No upcoming meetings yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcoming.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="glass-panel p-4 rounded-2xl border border-gray-700 flex flex-col gap-3"
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">{meeting.technology}</h3>
                      <span className="text-[11px] uppercase tracking-wide px-2 py-1 rounded-full border border-gray-600">
                        {formatStatus(meeting.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">
                      Student: <span className="text-white">{meeting.studentName}</span>
                    </p>
                    <p className="text-sm text-gray-400">
                      Scheduled: {new Date(meeting.scheduledAt).toLocaleString()}
                    </p>
                    <div className="text-xs text-gray-500">
                      Meeting Key: <span className="text-blue-300 font-mono">{meeting.meetingKey}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(meeting.status === 'APPROVED' || meeting.status === 'IN_PROGRESS') && (
                        <Button
                          onClick={() => onOpenMeeting(meeting)}
                          className="py-2 text-sm"
                          fullWidth
                        >
                          Go to Live Transcription
                        </Button>
                      )}
                      {meeting.status === 'REJECTED' && (
                        <span className="text-xs text-red-400">
                          This session was rejected. Contact support.
                        </span>
                      )}
                      {meeting.status === 'COMPLETED' && (
                        <Button variant="secondary" onClick={() => onOpenMeeting(meeting)}>
                          View Transcript
                        </Button>
                      )}
                    </div>
                    {meeting.status === 'PENDING' && (
                      <div className="mt-3 space-y-3 text-xs text-gray-300">
                        <p className="text-gray-400">
                          Awaiting admin approval. You can revise the request details until it is approved or rejected.
                        </p>
                        {editingMeetingId === meeting.id ? (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <label className="text-[11px] text-gray-400 uppercase tracking-wide">
                                Technology
                              </label>
                              <input
                                type="text"
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500"
                                value={editFields.technology}
                                onChange={(e) =>
                                  setEditFields((prev) => ({
                                    ...prev,
                                    technology: e.target.value,
                                  }))
                                }
                                disabled={editLoading}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[11px] text-gray-400 uppercase tracking-wide">
                                Student name
                              </label>
                              <input
                                type="text"
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500"
                                value={editFields.studentName}
                                onChange={(e) =>
                                  setEditFields((prev) => ({
                                    ...prev,
                                    studentName: e.target.value,
                                  }))
                                }
                                disabled={editLoading}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[11px] text-gray-400 uppercase tracking-wide">
                                Scheduled date &amp; time
                              </label>
                              <input
                                type="datetime-local"
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500"
                                value={editFields.scheduledAt}
                                onChange={(e) =>
                                  setEditFields((prev) => ({
                                    ...prev,
                                    scheduledAt: e.target.value,
                                  }))
                                }
                                min={getMinDateTime()}
                                disabled={editLoading}
                              />
                            </div>
                            {editError && (
                              <p className="text-xs text-red-400">{editError}</p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                onClick={handleEditSave}
                                disabled={editLoading}
                                className="py-2 text-xs"
                              >
                                {editLoading ? 'Saving...' : 'Update request'}
                              </Button>
                              <Button
                                variant="secondary"
                                type="button"
                                onClick={cancelEdit}
                                className="py-2 text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="secondary"
                            type="button"
                            onClick={() => startEdit(meeting)}
                            className="py-2 text-xs"
                          >
                            Edit request
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-semibold">Completed Meetings</h2>
              <span className="text-xs text-gray-400 uppercase tracking-wide">
                {completed.length} total
              </span>
            </div>
            {completed.length === 0 ? (
              <div className="glass-panel p-6 rounded-2xl border border-dashed border-gray-700 text-center text-gray-500">
                Completed meetings will appear here.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completed.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="glass-panel p-4 rounded-2xl border border-gray-700 space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">{meeting.technology}</h3>
                      <span className="text-[11px] uppercase tracking-wide px-2 py-1 rounded-full border border-gray-600 text-gray-300">
                        Completed
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">
                      Student: <span className="text-white">{meeting.studentName}</span>
                    </p>
                    <p className="text-sm text-gray-400">
                      Held: {new Date(meeting.scheduledAt).toLocaleString()}
                    </p>
                    <div className="text-xs text-gray-500">
                      Meeting Key: <span className="text-blue-300 font-mono">{meeting.meetingKey}</span>
                    </div>
                    <Button variant="secondary" onClick={() => onOpenMeeting(meeting)}>
                      View Transcript
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
