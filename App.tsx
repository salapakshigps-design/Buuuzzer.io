import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { InterviewSession } from './components/InterviewSession';
import { FeaturesPage } from './components/FeaturesPage';
import { HowItWorksPage } from './components/HowItWorksPage';
import { PrivacyPage } from './components/PrivacyPage';
import { TermsPage } from './components/TermsPage';
import { ContactPage } from './components/ContactPage';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminResetPassword } from './components/AdminResetPassword';
import { UserLogin } from './components/UserLogin';
import { MentorDashboard } from './components/MentorDashboard';
import { JoinMeeting } from './components/JoinMeeting';
import { MeetingTranscriptionMentor } from './components/MeetingTranscriptionMentor';
import { MeetingTranscriptionLearner } from './components/MeetingTranscriptionLearner';
import { UserPreferences, AppState, AIProvider, User, Meeting } from './types';
import { getCurrentUser, getDefaultProvider, clearAuth } from './services/backendApi';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [history, setHistory] = useState<AppState[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  
  // Auth State
  const [currentUsername, setCurrentUsername] = useState<string>('');
  // Admin State
  const [adminAiProvider, setAdminAiProvider] = useState<AIProvider>('GEMINI');

  // User Management State
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('buuzzer_users');
    // Migration for old data or init new
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure all users have fullName property if coming from old version
      return parsed.map((u: any) => ({ ...u, fullName: u.fullName || u.username }));
    }
    return [{ username: 'user1', fullName: 'Demo User', password: 'user123', createdAt: Date.now() }];
  });

  // Persist users to localStorage
  useEffect(() => {
    localStorage.setItem('buuzzer_users', JSON.stringify(users));
  }, [users]);

  const handleCreateUser = (user: User) => {
    setUsers(prev => [...prev, user]);
  };

  const handleDeleteUser = (username: string) => {
    setUsers(prev => prev.filter(u => u.username !== username));
  };

  const handleResetUserPassword = (username: string, newPass: string) => {
    setUsers(prev => prev.map(u => u.username === username ? { ...u, password: newPass } : u));
  };

  const handleNavigate = (state: AppState) => {
    setHistory(prev => [...prev, appState]);
    setAppState(state);
  }

  const handleBack = () => {
    if (
      appState === AppState.JOIN_MEETING ||
      appState === AppState.MEETING_TRANSCRIPTION_LEARNER ||
      appState === AppState.MEETING_TRANSCRIPTION_MENTOR
    ) {
      setActiveMeeting(null);
    }
    if (history.length === 0) {
      setAppState(AppState.LANDING);
      return;
    }
    const newHistory = [...history];
    const previousState = newHistory.pop();
    setHistory(newHistory);
    if (previousState) {
        setAppState(previousState);
    } else {
        setAppState(AppState.LANDING);
    }
  };

  const handleLogout = () => {
    setCurrentUsername('');
    setPreferences(null);
    setCurrentUser(null);
    setActiveMeeting(null);
    setHistory([]);
    setAppState(AppState.LANDING);
    clearAuth();
  };

  const handleLogin = () => {
    handleNavigate(AppState.USER_LOGIN);
  };

  const handleUserLoginSuccess = (user: User) => {
    const username = user.loginId || user.username || '';
    setCurrentUsername(username);
    setCurrentUser(user);
    if (user.role === 'mentor') {
      handleNavigate(AppState.MENTOR_DASHBOARD);
    } else {
      handleNavigate(AppState.DASHBOARD);
    }
  };

  const handleStartSession = (prefs: UserPreferences) => {
    setPreferences(prefs);
    handleNavigate(AppState.SESSION);
  };

  const handleEndSession = () => {
    handleBack(); // Returning to Dashboard
  };

  const handleOpenMentorMeeting = (meeting: Meeting) => {
    setActiveMeeting(meeting);
    handleNavigate(AppState.MEETING_TRANSCRIPTION_MENTOR);
  };

  const handleJoinMeetingForLearner = (meeting: Meeting) => {
    setActiveMeeting(meeting);
    handleNavigate(AppState.MEETING_TRANSCRIPTION_LEARNER);
  };

  const handleAdminLoginSuccess = () => {
    handleNavigate(AppState.ADMIN_DASHBOARD);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const token = localStorage.getItem('buuzzer_token');
      if (!token) return;
      const [current, provider] = await Promise.all([
        getCurrentUser().catch(() => null),
        getDefaultProvider().catch(() => null)
      ]);
      if (!active) return;
      if (provider) {
        setAdminAiProvider(provider);
      }
      if (current) {
        setCurrentUser(current);
        const username = current.loginId || current.username || '';
        setCurrentUsername(username);
        if (current.role === 'admin') {
          setAppState(AppState.ADMIN_DASHBOARD);
        } else if (current.role === 'mentor') {
          setAppState(AppState.MENTOR_DASHBOARD);
        } else {
          setAppState(AppState.DASHBOARD);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      {appState === AppState.LANDING && (
        <LandingPage onLogin={handleLogin} onNavigate={handleNavigate} />
      )}
      
      {appState === AppState.FEATURES && (
        <FeaturesPage onLogin={handleLogin} onNavigate={handleNavigate} onBack={handleBack} />
      )}

      {appState === AppState.HOW_IT_WORKS && (
        <HowItWorksPage onLogin={handleLogin} onNavigate={handleNavigate} onBack={handleBack} />
      )}

      {appState === AppState.PRIVACY && (
        <PrivacyPage onLogin={handleLogin} onNavigate={handleNavigate} onBack={handleBack} />
      )}

      {appState === AppState.TERMS && (
        <TermsPage onLogin={handleLogin} onNavigate={handleNavigate} onBack={handleBack} />
      )}

      {appState === AppState.CONTACT && (
        <ContactPage onLogin={handleLogin} onNavigate={handleNavigate} onBack={handleBack} />
      )}

      {appState === AppState.USER_LOGIN && (
        <UserLogin 
          onLogin={handleLogin} 
          onNavigate={handleNavigate} 
          onUserLoginSuccess={handleUserLoginSuccess}
          onBack={handleBack}
        />
      )}

      {appState === AppState.ADMIN_LOGIN && (
        <AdminLogin 
          onLogin={handleLogin} 
          onNavigate={handleNavigate} 
          onAdminLoginSuccess={handleAdminLoginSuccess}
          onBack={handleBack}
        />
      )}

      {appState === AppState.ADMIN_RESET_PASSWORD && (
        <AdminResetPassword 
          onNavigate={handleNavigate}
          onBack={handleBack}
        />
      )}

      {appState === AppState.ADMIN_DASHBOARD && (
        <AdminDashboard 
          onLogin={handleLogin} 
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          onProviderChange={setAdminAiProvider}
          currentProvider={adminAiProvider}
          onBack={handleBack}
        />
      )}

      {appState === AppState.MENTOR_DASHBOARD && currentUser?.role === 'mentor' && (
        <MentorDashboard
          currentUser={currentUser}
          onLogout={handleLogout}
          onBack={handleBack}
          onOpenMeeting={handleOpenMentorMeeting}
        />
      )}

      {appState === AppState.JOIN_MEETING && (
        <JoinMeeting
          onJoined={handleJoinMeetingForLearner}
          onCancel={handleBack}
        />
      )}

      {appState === AppState.MEETING_TRANSCRIPTION_MENTOR && activeMeeting && (
        <MeetingTranscriptionMentor meeting={activeMeeting} onBack={handleBack} />
      )}

      {appState === AppState.MEETING_TRANSCRIPTION_LEARNER && activeMeeting && (
        <MeetingTranscriptionLearner meeting={activeMeeting} onBack={handleBack} />
      )}

      {appState === AppState.DASHBOARD && currentUser?.role === 'user' && (
        <Dashboard 
          onStartSession={handleStartSession} 
          aiProvider={adminAiProvider}
          onBack={handleBack}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          currentUsername={currentUsername}
        />
      )}

      {appState === AppState.SESSION && preferences && (
        <InterviewSession 
          preferences={preferences} 
          onEndSession={handleEndSession}
        />
      )}
    </>
  );
};

export default App;
