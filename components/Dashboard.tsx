import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserPreferences, SavedInterview, ExamplePair, AIProvider, AppState, InterviewStatus } from '../types';
import { Button } from './Button';
import { listInterviews, createInterview, updateInterview, deleteInterview } from '../services/backendApi';

interface DashboardProps {
  onStartSession: (prefs: UserPreferences) => void;
  aiProvider: AIProvider;
  onBack?: () => void;
  onNavigate: (state: AppState) => void;
  onLogout: () => void;
  currentUsername: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onStartSession,
  aiProvider,
  onBack,
  onNavigate,
  onLogout,
  currentUsername
}) => {
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [listTab, setListTab] = useState<'UPCOMING' | 'HISTORY'>('UPCOMING');
  const [schedules, setSchedules] = useState<SavedInterview[]>([]);
  const [, refreshTick] = useState(Date.now());
  const loadInterviews = useCallback(async () => {
    try {
      const data = await listInterviews();
      setSchedules(data);
    } catch (err) {
      console.error("Failed to load interviews", err);
    }
  }, []);
  
  // Form State
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editingStatus, setEditingStatus] = useState<InterviewStatus | null>(null); // Track status to lock fields
  
  const [title, setTitle] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [responseStyle, setResponseStyle] = useState('Simple, Professional English');
  const [maxLines, setMaxLines] = useState(30);
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  
  // Example State
  const [examples, setExamples] = useState<ExamplePair[]>([]);
  const [newExQuestion, setNewExQuestion] = useState('');
  const [newExAnswer, setNewExAnswer] = useState('');
  const [historyReuseNote, setHistoryReuseNote] = useState('');

  // Load interviews from backend on mount
  useEffect(() => {
    loadInterviews();
    const handleSessionUpdate = () => loadInterviews();
    window.addEventListener('sessionUpdated', handleSessionUpdate);
    return () => {
      window.removeEventListener('sessionUpdated', handleSessionUpdate);
    };
  }, [loadInterviews]);


  const resetForm = () => {
    setTitle('');
    setResumeText('');
    setJobDescription('');
    setResponseStyle('Simple, Professional English');
    setMaxLines(30);
    setExamples([]);
    setNewExQuestion('');
    setNewExAnswer('');
    setScheduledAt('');
    setDurationMinutes(60);
    setEditingId(null);
    setEditingStatus(null);
    setHistoryReuseNote('');
  };

  const handleCreateNew = () => {
    resetForm();
    setView('FORM');
  };

  const handleEdit = (schedule: SavedInterview) => {
    setTitle(schedule.title);
    setResumeText(schedule.resumeText);
    setJobDescription(schedule.jobDescription);
    setResponseStyle(schedule.responseStyle);
    setMaxLines(schedule.maxLines);
    setExamples(schedule.examples || []);
    setScheduledAt(schedule.scheduledAt || '');
    setDurationMinutes(schedule.durationMinutes || 60);
    setEditingId(schedule.id);
    setEditingStatus(schedule.status);
    setView('FORM');
    setHistoryReuseNote('');
  };

  const handleRecreateFromHistory = (schedule: SavedInterview) => {
    setTitle(schedule.title);
    setResumeText(schedule.resumeText);
    setJobDescription(schedule.jobDescription);
    setResponseStyle(schedule.responseStyle || 'Simple, Professional English');
    setMaxLines(30);
    setExamples(schedule.examples ? [...schedule.examples] : []);
    setScheduledAt(schedule.scheduledAt || '');
    setDurationMinutes(schedule.durationMinutes || 60);
    setEditingId(null);
    setEditingStatus(null);
    const scheduledLabel = schedule.scheduledAt
      ? new Date(schedule.scheduledAt).toLocaleString()
      : 'previous history entry';
    setHistoryReuseNote(
      `Reusing the request scheduled for ${scheduledLabel}. It will be submitted as a new request for approval.`
    );
    setView('FORM');
  };

  const handleAddExample = () => {
    if (!newExQuestion.trim() || !newExAnswer.trim()) return;
    setExamples([...examples, { question: newExQuestion, answer: newExAnswer }]);
    setNewExQuestion('');
    setNewExAnswer('');
  };

  const handleRemoveExample = (index: number) => {
    setExamples(examples.filter((_, i) => i !== index));
  };

  const getMinDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !resumeText.trim() || !jobDescription.trim() || !scheduledAt) {
      alert("Please fill in all required fields, including Date & Time.");
      return;
    }

    if (new Date(scheduledAt) < new Date()) {
      alert("You cannot schedule an interview for a past date or time.");
      return;
    }

    try {
      if (editingId) {
        const updated = await updateInterview(editingId, {
          title,
          jobDescription,
          resumeText,
          scheduledAt,
          durationMinutes,
          status: 'PENDING',
        });
        setSchedules(prev => prev.map(s => s.id === updated.id ? updated : s));
        alert("Schedule updated. It has been marked as PENDING for Admin approval.");
      } else {
        const created = await createInterview({
          title,
          jobDescription,
          resumeText,
          scheduledAt,
          durationMinutes,
        });
        setSchedules(prev => [created, ...prev]);
        alert("Interview Request Created! Please wait for Admin approval.");
      }

      setView('LIST');
      resetForm();
    } catch (err: any) {
      console.error("Failed to save interview", err);
      alert(err.message || "Failed to save interview");
    }
  };

  const handleDelete = async (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!confirm("Are you sure you want to delete this interview schedule?")) return;
    try {
      await deleteInterview(id);
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      console.error("Failed to delete interview", err);
      alert(err.message || "Failed to delete interview");
    }
  };

  const handleLaunch = (schedule: SavedInterview) => {
    if (schedule.status !== 'APPROVED') {
      alert("This interview has not been approved by the Admin yet.");
      return;
    }

    const scheduledMs = schedule.scheduledAt ? new Date(schedule.scheduledAt).getTime() : null;
    const now = Date.now();
    if (scheduledMs && now < scheduledMs - 10 * 60 * 1000) {
      alert("You can only start the session within 10 minutes before the scheduled time.");
      return;
    }

    const durationSeconds = (schedule.durationMinutes || 0) * 60;
    const usedSeconds = schedule.sessionSecondsUsed || 0;
    if (durationSeconds > 0 && usedSeconds >= durationSeconds) {
      alert("This interview has already consumed its full duration.");
      return;
    }

    onStartSession({
      resumeText: schedule.resumeText,
      jobDescription: schedule.jobDescription,
      responseStyle: schedule.responseStyle,
      maxLines: schedule.maxLines,
      examples: schedule.examples || [],
      aiProvider: aiProvider,
      interviewId: schedule.id,
      durationMinutes: schedule.durationMinutes,
      sessionSecondsUsed: usedSeconds,
      scheduledAt: schedule.scheduledAt
    });
  };

  // Helper to check if interview is expired
  const isExpired = (schedule: SavedInterview) => {
    const usedSeconds = schedule.sessionSecondsUsed || 0;
    const durationSeconds = (schedule.durationMinutes || 60) * 60;
    if (durationSeconds > 0 && usedSeconds >= durationSeconds) {
      return true;
    }
    if (!schedule.scheduledAt) return false;
    const startTime = new Date(schedule.scheduledAt).getTime();
    const durationMs = (schedule.durationMinutes || 60) * 60 * 1000;
    const endTime = startTime + durationMs;
    return Date.now() > endTime;
  };

  const filteredSchedules = schedules.filter((s) => {
    const expired = isExpired(s);
    return listTab === 'UPCOMING' ? !expired : expired;
  });

  useEffect(() => {
    const interval = window.setInterval(() => refreshTick(Date.now()), 30 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  const StatusBadge = ({ status }: { status: InterviewStatus }) => {
    const colors = {
      'PENDING': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      'APPROVED': 'bg-green-500/20 text-green-400 border-green-500/50',
      'REJECTED': 'bg-red-500/20 text-red-400 border-red-500/50'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold border ${colors[status] || colors['PENDING']}`}>
        {status}
      </span>
    );
  };

  // --- RENDER: LIST VIEW ---
  if (view === 'LIST') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center py-10 px-4">
        <header className="w-full max-w-6xl mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            {onBack && (
                <button 
                  onClick={() => {
                    if (window.confirm("Are you sure you want to logout?")) {
                        onLogout();
                    }
                  }} 
                  className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors border border-gray-700"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
            )}
            <div>
              <h2 className="text-3xl font-bold text-white">My Interviews</h2>
              <div className="flex items-center gap-2 mt-1">
                 <p className="text-gray-400 text-sm">Welcome, <span className="text-blue-400 font-bold">{currentUsername}</span>. Manage your requests here.</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">

  {/* Logout – pure red */}
  <Button
    variant="danger"
    onClick={onLogout}
    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
  >
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
    Logout
  </Button>

  {/* Join Mentor Meeting – white background, black text */}
  <Button
    variant="secondary"
    onClick={() => onNavigate(AppState.JOIN_MEETING)}
    className="flex items-center gap-2 bg-white text-black hover:bg-gray-200 border border-gray-300"
  >
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 12v9m0 0l-3-3m3 3l3-3M19 12l-7-8-7 8m14 0H5"
      />
    </svg>
    Join Mentor Meeting
  </Button>

  {/* Request Interview – default */}
  <Button onClick={handleCreateNew} className="flex items-center gap-2">
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
    Request Interview
  </Button>

</div>

        </header>

        <div className="w-full max-w-6xl mb-6">
           <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg inline-flex">
              <button 
                onClick={() => setListTab('UPCOMING')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${listTab === 'UPCOMING' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Upcoming
              </button>
              <button 
                onClick={() => setListTab('HISTORY')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${listTab === 'HISTORY' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
              >
                History
              </button>
           </div>
        </div>

        <div className="w-full max-w-6xl">
          {filteredSchedules.length === 0 ? (
            <div className="glass-panel p-16 rounded-2xl flex flex-col items-center justify-center text-center border-dashed border-2 border-gray-700">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6 text-gray-600">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No {listTab === 'UPCOMING' ? 'Upcoming' : 'Past'} Interviews</h3>
              <p className="text-gray-400 mb-8 max-w-md">
                {listTab === 'UPCOMING' 
                  ? "Schedule a new interview to get started. Approved interviews will appear here." 
                  : "Completed interviews will appear here after their scheduled duration has passed."}
              </p>
              {listTab === 'UPCOMING' && <Button onClick={handleCreateNew} variant="secondary">Create Request</Button>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSchedules.map((schedule) => (
                <div key={schedule.id} className={`glass-panel p-6 rounded-xl border border-gray-700 transition-all group flex flex-col relative overflow-hidden ${listTab === 'HISTORY' ? 'opacity-75 grayscale-[30%]' : 'hover:border-blue-500/50'}`}>
                  
                  {listTab === 'UPCOMING' && (
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(schedule); }} 
                        className="text-blue-400 hover:text-blue-300 p-2 bg-gray-900/80 rounded-full hover:bg-gray-800 transition-colors"
                        title="Edit Schedule"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button 
                        onClick={(e) => handleDelete(schedule.id, e)} 
                        className="text-red-400 hover:text-red-300 p-2 bg-gray-900/80 rounded-full hover:bg-gray-800 transition-colors"
                        title="Delete Schedule"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  )}

                  <div className="mb-4 pr-16">
                    <div className="flex justify-between items-start mb-2">
                      <StatusBadge status={schedule.status || 'PENDING'} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1 truncate">{schedule.title}</h3>
                    <div className="text-xs text-gray-500 font-mono space-y-1">
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {schedule.scheduledAt ? new Date(schedule.scheduledAt).toLocaleString() : 'No date set'}
                      </div>
                      <div className="flex items-center gap-1 text-blue-400">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Duration: {schedule.durationMinutes || 60} mins
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex items-center text-sm text-gray-400">
                       <span className="w-24 shrink-0 text-gray-500">Style:</span>
                       <span className="truncate text-blue-300">{schedule.responseStyle}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 bg-gray-800/50 p-2 rounded truncate">
                       JD: {schedule.jobDescription.substring(0, 50)}...
                    </div>
                  </div>

                  {listTab === 'UPCOMING' && (
                    schedule.status === 'APPROVED' ? (
                      <Button onClick={() => handleLaunch(schedule)} fullWidth className="mt-auto group-hover:bg-blue-600 transition-colors">
                        Launch Session
                      </Button>
                    ) : (
                      <Button
                        disabled
                        fullWidth
                        className="mt-auto bg-gray-800 text-white cursor-not-allowed border-gray-700"
                      >
                        {schedule.status === 'REJECTED' ? 'Request Rejected' : 'Waiting Approval'}
                      </Button>
                    )
                  )}
                  {listTab === 'HISTORY' && (
                    <div className="mt-auto space-y-2">
                      <Button
                        variant="secondary"
                        type="button"
                        className="w-full py-2 text-xs uppercase tracking-wide"
                        onClick={() => handleRecreateFromHistory(schedule)}
                      >
                        Reuse Request
                      </Button>
                      <div className="text-center text-sm text-gray-500 italic py-2 border-t border-gray-700">
                        Completed / Expired
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- RENDER: FORM VIEW ---
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center py-10 px-4">
      <header className="w-full max-w-5xl mb-8 flex items-center gap-4">
        <button onClick={() => setView('LIST')} className="flex items-center text-gray-400 hover:text-white transition-colors">
           <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
           Back to Interviews
        </button>
        <h2 className="text-2xl font-bold text-white">{editingId ? 'Edit Request' : 'Request Interview'}</h2>
      </header>

      <form onSubmit={handleSaveSchedule} className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {historyReuseNote && (
          <div className="col-span-full">
            <div className="text-sm text-yellow-300 border border-yellow-500/40 bg-yellow-900/20 p-3 rounded-xl">
              {historyReuseNote}
            </div>
          </div>
        )}
        
        {/* Left Column: Context */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl">
            <label className="block text-blue-300 font-semibold mb-3">
              Interview Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-4"
              placeholder="e.g. Google Frontend Interview"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-blue-300 font-semibold mb-3">
                  Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  className={`w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none custom-datetime ${editingStatus === 'APPROVED' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  disabled={editingStatus === 'APPROVED'}
                  min={getMinDateTime()}
                  title={editingStatus === 'APPROVED' ? "Time cannot be changed after Admin approval" : "Select date"}
                  required
                />
              </div>
              <div>
                <label className="block text-blue-300 font-semibold mb-3">
                  Duration <span className="text-red-500">*</span>
                </label>
                <select
                   className={`w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${editingStatus === 'APPROVED' ? 'opacity-50 cursor-not-allowed' : ''}`}
                   value={durationMinutes}
                   onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                   disabled={editingStatus === 'APPROVED'}
                   title={editingStatus === 'APPROVED' ? "Duration cannot be changed after Admin approval" : "Select duration"}
                >
                   <option value={30}>30 Minutes</option>
                   <option value={45}>45 Minutes</option>
                   <option value={60}>1 Hour</option>
                   <option value={90}>1 Hour 30 Min</option>
                   <option value={120}>2 Hours</option>
                </select>
              </div>
            </div>
            {editingStatus === 'APPROVED' && (
               <p className="text-xs text-yellow-500 mb-4 bg-yellow-900/20 p-2 rounded border border-yellow-900">
                 Note: Date and Duration are locked because this interview is Approved.
               </p>
            )}

            <label className="block text-blue-300 font-semibold mb-3">
              Paste Your Resume <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full h-48 bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Copy and paste your plain text resume here..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              required
            />
          </div>

          <div className="glass-panel p-6 rounded-2xl">
            <label className="block text-blue-300 font-semibold mb-3">
              Job Description (JD) <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full h-48 bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Right Column: Preferences & Examples */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-xl font-semibold text-white mb-4">Configuration</h3>
            
            <div className="mb-6">
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Response Style
              </label>
              <input
                type="text"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500"
                value={responseStyle}
                onChange={(e) => setResponseStyle(e.target.value)}
                placeholder="e.g. Concise, Technical, Friendly"
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Max Response Length (Lines)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="3"
                  max="50"
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  value={maxLines}
                  onChange={(e) => setMaxLines(parseInt(e.target.value))}
                />
                <span className="text-white font-mono bg-gray-700 px-3 py-1 rounded">{maxLines}</span>
              </div>
            </div>
          </div>

          {/* New Section: Examples */}
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-blue-500">
            <h3 className="text-xl font-semibold text-white mb-2">Training Examples</h3>
            <p className="text-sm text-gray-400 mb-4">Provide Q&A pairs to teach the AI exactly how you want it to respond (Few-Shot Learning).</p>
            
            <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
               {examples.length === 0 && (
                 <div className="text-center py-4 text-gray-500 text-sm italic bg-gray-800/30 rounded-lg border border-dashed border-gray-700">
                    No examples added yet. Add one below to guide the AI.
                 </div>
               )}
               {examples.map((ex, idx) => (
                 <div key={idx} className="bg-gray-800 rounded-lg p-3 border border-gray-700 relative group">
                    <button 
                      type="button"
                      onClick={() => handleRemoveExample(idx)}
                      className="absolute top-2 right-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="text-xs text-blue-400 font-bold mb-1">Q: {ex.question}</div>
                    <div className="text-sm text-gray-300">A: {ex.answer}</div>
                 </div>
               ))}
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-700">
              <input
                type="text"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="Example Question (e.g. Tell me about yourself)"
                value={newExQuestion}
                onChange={(e) => setNewExQuestion(e.target.value)}
              />
              <textarea
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none resize-none h-20"
                placeholder="Example Answer (Write how you want the AI to sound...)"
                value={newExAnswer}
                onChange={(e) => setNewExAnswer(e.target.value)}
              />
              <Button type="button" onClick={handleAddExample} variant="secondary" fullWidth className="py-2 text-sm">
                 + Add Example Pair
              </Button>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl bg-gradient-to-b from-blue-900/20 to-gray-800/20 border-blue-500/30">
            <h3 className="text-white font-semibold mb-2">
              {editingId ? 'Update Request' : 'Submit Request'}
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              {editingId 
                ? 'Updating will reset approval status to PENDING.' 
                : 'Your interview request will be sent to the Admin for approval.'
              }
            </p>
            <div className="flex gap-4">
              <Button type="button" variant="secondary" onClick={() => setView('LIST')} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-[2]">
                {editingId ? 'Update Request' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
