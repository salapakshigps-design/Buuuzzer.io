
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import {
  AppState,
  AIProvider,
  SavedInterview,
  User,
  ContactSubmissionRecord,
  Meeting,
} from '../types';
import { Button } from './Button';
import { jsPDF } from 'jspdf';
import {
  getAdminSettings,
  saveAdminSettings,
  listInterviews,
  updateInterview,
  listUsers,
  createUser,
  deleteUser,
  changeUserPassword,
  listContactSubmissions,
  deleteContactSubmission,
  deleteInterview,
  listAllMeetingsForAdmin,
  deleteMeetingAsAdmin,
  listPendingMeetingsForAdmin,
  updateMeetingByAdmin,
} from '../services/backendApi';

interface PageProps {
  onLogin: () => void;
  onNavigate: (state: AppState) => void;
  onLogout: () => void;
  onProviderChange?: (provider: AIProvider) => void;
  currentProvider: AIProvider;
  onBack?: () => void;
}

type InterviewRow = SavedInterview & { candidateName: string };
type OverviewInterviewRow = InterviewRow & {
  ownerName: string;
  ownerRole: User['role'] | 'user';
};

const mapMeetingToOverviewRow = (meeting: Meeting): OverviewInterviewRow => {
  const scheduled = meeting.scheduledAt || '';
  return {
    id: meeting.id,
    title: meeting.technology || 'Mentor Meeting',
    resumeText: '',
    jobDescription: '',
    responseStyle: 'Simple English',
    maxLines: 0,
    examples: [],
    status: meeting.status,
    scheduledAt: scheduled,
    durationMinutes: 0,
    sessionSecondsUsed: 0,
    createdBy: meeting.studentName,
    userId: undefined,
    candidateName: meeting.studentName,
    ownerName: meeting.studentName,
    ownerRole: 'mentor',
    updatedAt: meeting.updatedAt ?? meeting.createdAt ?? scheduled,
  };
};

export const AdminDashboard: React.FC<PageProps> = ({
  onLogin,
  onNavigate,
  onLogout,
  currentProvider,
  onBack,
  onProviderChange,
}) => {
  const [activeTab, setActiveTab] = useState<
    | 'OVERVIEW'
    | 'PENDING_REQUESTS'
    | 'USERS'
    | 'SUPPORT'
    | 'SETTINGS'
    | 'INTERVIEW_HISTORY'
    | 'MENTOR_HISTORY'
  >('OVERVIEW');

  // Provider / API key state
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(currentProvider);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [deepSeekKey, setDeepSeekKey] = useState('');
  const [deepgramKey, setDeepgramKey] = useState('');
  const [openaiKeyDirty, setOpenaiKeyDirty] = useState(false);
  const [geminiKeyDirty, setGeminiKeyDirty] = useState(false);
  const [deepSeekKeyDirty, setDeepSeekKeyDirty] = useState(false);
  const [deepgramKeyDirty, setDeepgramKeyDirty] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const handleOpenaiKeyChange = (value: string) => {
    setOpenaiKey(value);
    setOpenaiKeyDirty(true);
  };

  const handleGeminiKeyChange = (value: string) => {
    setGeminiKey(value);
    setGeminiKeyDirty(true);
  };

  const handleDeepSeekKeyChange = (value: string) => {
    setDeepSeekKey(value);
    setDeepSeekKeyDirty(true);
  };

  const handleDeepgramKeyChange = (value: string) => {
    setDeepgramKey(value);
    setDeepgramKeyDirty(true);
  };

  // Data state
  const [allInterviews, setAllInterviews] = useState<SavedInterview[]>([]);
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [contactSubmissions, setContactSubmissions] = useState<ContactSubmissionRecord[]>([]);
  const [contactLoading, setContactLoading] = useState(false);
  const [whatsappVisible, setWhatsappVisible] = useState(false);
  const [supportPhone, setSupportPhone] = useState<string | null>(null);
  const [supportSaving, setSupportSaving] = useState(false);
  const [supportMessage, setSupportMessage] = useState<string | null>(null);
  const [contactCsvExporting, setContactCsvExporting] = useState(false);
  const [contactDeleting, setContactDeleting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [selectedInterviewIds, setSelectedInterviewIds] = useState<string[]>([]);
  const [selectedMeetingIds, setSelectedMeetingIds] = useState<string[]>([]);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [pendingMentorMeetings, setPendingMentorMeetings] = useState<Meeting[]>([]);
  const [pendingMeetingsLoading, setPendingMeetingsLoading] = useState(false);
  const [interviewExportingPdf, setInterviewExportingPdf] = useState(false);
  const [meetingExportingPdf, setMeetingExportingPdf] = useState(false);
  const [interviewCsvExporting, setInterviewCsvExporting] = useState(false);
  const [meetingCsvExporting, setMeetingCsvExporting] = useState(false);
  const [processingInterviewDeletion, setProcessingInterviewDeletion] = useState(false);
  const [processingMeetingDeletion, setProcessingMeetingDeletion] = useState(false);
  const [countryCode, setCountryCode] = useState('+91');
  const [localNumber, setLocalNumber] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // User management forms
  const [newUserRole, setNewUserRole] = useState<'user' | 'mentor'>('user');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserLoginId, setNewUserLoginId] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserMessage, setCreateUserMessage] = useState<string | null>(null);

  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [viewingContact, setViewingContact] = useState<ContactSubmissionRecord | null>(null);
  const [contactActionMessage, setContactActionMessage] = useState<string | null>(null);

  const loadInterviews = useCallback(async () => {
    try {
      const interviews = await listInterviews();
      setAllInterviews(interviews);
    } catch (err) {
      console.error('Failed to load interviews', err);
    }
  }, []);

  const loadContactEntries = useCallback(async () => {
    setContactLoading(true);
    try {
      const submissions = await listContactSubmissions();
      setContactSubmissions(submissions);
      setSelectedContactIds([]);
      setViewingContact(null);
    } catch (err) {
      console.error('Failed to load contact submissions', err);
    } finally {
      setContactLoading(false);
    }
  }, []);

  const loadPendingMentorMeetings = useCallback(async () => {
    setPendingMeetingsLoading(true);
    try {
      const meetings = await listPendingMeetingsForAdmin();
      setPendingMentorMeetings(meetings);
    } catch (err) {
      console.error('Failed to load pending mentor meetings', err);
    } finally {
      setPendingMeetingsLoading(false);
    }
  }, []);

  const loadMeetingHistory = useCallback(async () => {
    setMeetingsLoading(true);
    try {
      const meetings = await listAllMeetingsForAdmin();
      setAllMeetings(meetings);
      setSelectedMeetingIds([]);
    } catch (err) {
      console.error('Failed to load mentor session history', err);
    } finally {
      setMeetingsLoading(false);
    }
  }, []);

  const handleUpdateSupportPhone = useCallback(async () => {
    const trimmedCountry = countryCode.trim() || '+91';
    const trimmedNumber = localNumber.trim();
    if (!trimmedNumber) {
      setSupportMessage('Contact number cannot be empty.');
      return;
    }
    const combined = `${trimmedCountry} ${trimmedNumber}`.trim();
    setSupportSaving(true);
    try {
      await saveAdminSettings({ supportPhone: combined });
      setSupportPhone(combined);
      setSupportMessage('Contact number updated.');
      window.dispatchEvent(
        new CustomEvent('supportPhoneUpdated', { detail: combined })
      );
    } catch (err) {
      console.error('Failed to update contact number', err);
      setSupportMessage('Failed to update contact number');
    } finally {
      setSupportSaving(false);
      window.setTimeout(() => setSupportMessage(null), 4000);
    }
  }, [countryCode, localNumber]);

  const notifySupportMessage = useCallback((text: string) => {
    setSupportMessage(text);
    window.setTimeout(() => setSupportMessage(null), 4000);
  }, []);

  const exportContactsToPdf = useCallback(
    (entries: ContactSubmissionRecord[], label: string, filenameSuffix: string) => {
      if (entries.length === 0) {
        notifySupportMessage('No submissions to export.');
        return;
      }
      setExportingPdf(true);
      try {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(
          label,
          14,
          20,
        );
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
        let cursor = 36;
        entries.forEach((entry, index) => {
          if (cursor > 270) {
            doc.addPage();
            cursor = 20;
          }
          doc.setFontSize(11);
          doc.text(`${index + 1}. ${entry.name} (${entry.email})`, 14, cursor);
          cursor += 6;
          doc.setFontSize(10);
          doc.text(`Subject: ${entry.subject}`, 14, cursor);
          cursor += 6;
          doc.text(`Submitted: ${new Date(entry.createdAt).toLocaleString()}`, 14, cursor);
          cursor += 6;
          const lines = doc.splitTextToSize(entry.message, 180);
          lines.forEach((line) => {
            if (cursor > 280) {
              doc.addPage();
              cursor = 20;
            }
            doc.text(line, 14, cursor);
            cursor += 5;
          });
          cursor += 8;
        });
        doc.save(`contact-submissions-${filenameSuffix}-${new Date().toISOString()}.pdf`);
        notifySupportMessage('PDF export generated.');
      } catch (err) {
        console.error('Failed to export PDF', err);
        notifySupportMessage('Failed to export PDF.');
      } finally {
        setExportingPdf(false);
      }
    },
    [notifySupportMessage],
  );

  const handleExportSubmissions = useCallback(() => {
    exportContactsToPdf(contactSubmissions, 'Contact Support Submissions', 'all');
  }, [contactSubmissions, exportContactsToPdf]);

  const handleDownloadSelectedContactsPdf = useCallback(() => {
    if (selectedContactIds.length === 0) {
      alert('Select at least one submission.');
      return;
    }
    const entries = contactSubmissions.filter((entry) =>
      selectedContactIds.includes(entry.id),
    );
    if (entries.length === 0) {
      alert('No valid submissions selected.');
      return;
    }
    exportContactsToPdf(entries, 'Selected Contact Support Submissions', 'selected');
  }, [contactSubmissions, exportContactsToPdf, selectedContactIds]);

  const downloadContactCsv = useCallback(() => {
    if (contactSubmissions.length === 0) {
      alert('No submissions available for export.');
      return;
    }
    setContactCsvExporting(true);
    try {
      const lines = [
        ['Name', 'Email', 'Subject', 'Message', 'Submitted At'],
        ...contactSubmissions.map((entry) => [
          entry.name,
          entry.email,
          entry.subject,
          entry.message,
          new Date(entry.createdAt).toLocaleString(),
        ]),
      ];
      const csvContent = buildCsv(lines);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'contact-support-submissions.csv';
      anchor.click();
      URL.revokeObjectURL(url);
      setContactActionMessage('CSV export ready.');
      window.setTimeout(() => setContactActionMessage(null), 4000);
    } catch (err) {
      console.error('Failed to export contact CSV', err);
      alert('Failed to export CSV');
    } finally {
      setContactCsvExporting(false);
    }
  }, [contactSubmissions]);

  const toggleSelectAllContacts = useCallback(() => {
    if (contactSubmissions.length === 0) return;
    setSelectedContactIds((prev) =>
      prev.length === contactSubmissions.length
        ? []
        : contactSubmissions.map((entry) => entry.id)
    );
  }, [contactSubmissions]);

  const toggleContactSelection = useCallback((contactId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  }, []);

  const handleDeleteSelectedContacts = useCallback(async () => {
    if (selectedContactIds.length === 0) {
      setContactActionMessage('Select at least one submission to delete.');
      window.setTimeout(() => setContactActionMessage(null), 3000);
      return;
    }
    if (!window.confirm('Delete selected contact submissions?')) return;
    setContactDeleting(true);
    try {
      await Promise.all(selectedContactIds.map((id) => deleteContactSubmission(id)));
      setContactActionMessage('Selected submissions deleted.');
      window.setTimeout(() => setContactActionMessage(null), 4000);
      await loadContactEntries();
    } catch (err: any) {
      console.error('Failed to delete selected submissions', err);
      alert(err.message || 'Failed to delete selected submissions');
    } finally {
      setContactDeleting(false);
    }
  }, [selectedContactIds, loadContactEntries]);

  const handleDeleteContact = useCallback(
    async (contactId: string) => {
      if (!window.confirm('Delete this submission?')) return;
      setContactDeleting(true);
      try {
        await deleteContactSubmission(contactId);
        setContactActionMessage('Submission deleted.');
        window.setTimeout(() => setContactActionMessage(null), 4000);
        await loadContactEntries();
      } catch (err: any) {
        console.error('Failed to delete submission', err);
        alert(err.message || 'Failed to delete submission');
      } finally {
        setContactDeleting(false);
      }
    },
    [loadContactEntries]
  );

  const handleViewContact = useCallback((entry: ContactSubmissionRecord) => {
    setViewingContact(entry);
    setContactActionMessage(null);
  }, []);

  const handleRequestContact = useCallback((entry: ContactSubmissionRecord) => {
    setViewingContact(entry);
    setContactActionMessage(`Request noted for ${entry.name}.`);
    window.setTimeout(() => setContactActionMessage(null), 4000);
  }, []);

  // Load settings, users, and interviews on mount
  useEffect(() => {
    setSelectedProvider(currentProvider);
  }, [currentProvider]);

  useEffect(() => {
  const bootstrap = async () => {
    try {
      const [settings, users] = await Promise.all([
        getAdminSettings().catch(() => null),
        listUsers(),
      ]);

      if (settings) {
        setOpenaiKey(settings.openaiKeyMasked || '');
        setGeminiKey(settings.geminiKeyMasked || '');
        setDeepSeekKey(settings.deepseekKeyMasked || '');
        setDeepgramKey(settings.deepgramKeyMasked || '');
        setOpenaiKeyDirty(false);
        setGeminiKeyDirty(false);
        setDeepSeekKeyDirty(false);
        setDeepgramKeyDirty(false);
        setSupportPhone(settings.supportPhone || null);
      } else {
        setSupportPhone(null);
      }
      setAdminUsers(
        users.map((u) => ({
          ...u,
          username: u.loginId,
          fullName: u.name,
        }))
      );
    } catch (err) {
      console.error('Failed to bootstrap admin dashboard', err);
    } finally {
      setSettingsLoaded(true);
    }
  };
  bootstrap();
}, []);

  useEffect(() => {
    if (!supportPhone) {
      setCountryCode('+91');
      setLocalNumber('');
      return;
    }
    const trimmed = supportPhone.trim();
    if (trimmed.startsWith('+')) {
      const parts = trimmed.split(/\s+/);
      setCountryCode(parts[0]);
      setLocalNumber(parts.slice(1).join('').trim());
    } else {
      setCountryCode('+91');
      setLocalNumber(trimmed);
    }
  }, [supportPhone]);

  useEffect(() => {
    loadInterviews();
    loadContactEntries();
    loadPendingMentorMeetings();
    loadMeetingHistory();
    const handleSessionUpdate = () => loadInterviews();
    window.addEventListener('sessionUpdated', handleSessionUpdate);
    return () => window.removeEventListener('sessionUpdated', handleSessionUpdate);
  }, [
    loadInterviews,
    loadContactEntries,
    loadPendingMentorMeetings,
    loadMeetingHistory,
  ]);

  useEffect(() => {
    if (activeTab === 'MENTOR_HISTORY') {
      loadMeetingHistory();
    }
    if (activeTab === 'PENDING_REQUESTS') {
      loadPendingMentorMeetings();
    }
  }, [activeTab, loadMeetingHistory, loadPendingMentorMeetings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsMessage(null);
    try {
      const openaiPayload = openaiKeyDirty ? openaiKey || undefined : undefined;
      const geminiPayload = geminiKeyDirty ? geminiKey || undefined : undefined;
      const deepSeekPayload = deepSeekKeyDirty ? deepSeekKey || undefined : undefined;
      const deepgramPayload = deepgramKeyDirty ? deepgramKey || undefined : undefined;
      const updated = await saveAdminSettings({
        defaultProvider: selectedProvider,
        openaiApiKey: openaiPayload,
        geminiApiKey: geminiPayload,
        deepseekApiKey: deepSeekPayload,
        deepgramApiKey: deepgramPayload,
      });
      setSettingsMessage('Settings saved successfully');
      onProviderChange?.(selectedProvider);
      setOpenaiKey(updated.openaiKeyMasked || '');
      setGeminiKey(updated.geminiKeyMasked || '');
      setDeepSeekKey(updated.deepseekKeyMasked || '');
      setDeepgramKey(updated.deepgramKeyMasked || '');
      setOpenaiKeyDirty(false);
      setGeminiKeyDirty(false);
      setDeepSeekKeyDirty(false);
      setDeepgramKeyDirty(false);
    } catch (err: any) {
      console.error('Failed to save settings', err);
      setSettingsMessage('Failed to save settings');
    } finally {
      setSettingsSaving(false);
      setTimeout(() => setSettingsMessage(null), 3000);
    }
  };

  // Stats
  const today = new Date().toDateString();
  const interviewsToday = useMemo(
    () =>
      allInterviews.filter((i) => new Date(i.scheduledAt).toDateString() === today).length,
    [allInterviews, today]
  );
  const pendingCount = useMemo(
    () => allInterviews.filter((i) => i.status === 'PENDING').length,
    [allInterviews]
  );
  const totalUsers = adminUsers.length;
  const learners = useMemo(() => adminUsers.filter((user) => user.role === 'user'), [adminUsers]);
  const mentors = useMemo(() => adminUsers.filter((user) => user.role === 'mentor'), [adminUsers]);

  const filteredInterviews = useMemo(() => {
    const search = searchQuery.toLowerCase();
    return allInterviews
      .filter((interview) => {
        const owner = adminUsers.find((u) => u.id === interview.userId);
        const ownerName = owner?.fullName || owner?.username || interview.createdBy || '';
        const dateMatches =
          !dateFilter ||
          (interview.scheduledAt &&
            new Date(interview.scheduledAt).toISOString().slice(0, 10) === dateFilter);
        const searchMatches =
          !search ||
          interview.title.toLowerCase().includes(search) ||
          ownerName.toLowerCase().includes(search) ||
          (interview.createdBy || '').toLowerCase().includes(search);
        return dateMatches && searchMatches;
      })
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
  }, [allInterviews, adminUsers, searchQuery, dateFilter]);

  const overviewInterviewRows = useMemo<OverviewInterviewRow[]>(() => {
    return filteredInterviews.map((interview) => {
      const owner = adminUsers.find((u) => u.id === interview.userId);
      const ownerName =
        owner?.fullName || owner?.username || interview.createdBy || 'Unknown';
      const ownerRole = owner?.role || 'user';
      return {
        ...interview,
        candidateName: ownerName,
        ownerName,
        ownerRole,
      };
    });
  }, [filteredInterviews, adminUsers]);

  const allLearnerRequests = useMemo(
    () => overviewInterviewRows.filter((row) => row.ownerRole !== 'mentor'),
    [overviewInterviewRows]
  );
  const allMentorRequests = useMemo(
    () => overviewInterviewRows.filter((row) => row.ownerRole === 'mentor'),
    [overviewInterviewRows]
  );
  const overviewLearnerRequests = useMemo(
    () => allLearnerRequests.filter((row) => row.status !== 'PENDING'),
    [allLearnerRequests]
  );
  const mentorMeetingOverviewRows = useMemo<OverviewInterviewRow[]>(() => {
    return [...allMeetings]
      .filter((meeting) => meeting.status !== 'PENDING')
      .map(mapMeetingToOverviewRow)
      .sort((a, b) => {
        const aTime = new Date(a.scheduledAt).getTime();
        const bTime = new Date(b.scheduledAt).getTime();
        const safeA = Number.isNaN(aTime) ? 0 : aTime;
        const safeB = Number.isNaN(bTime) ? 0 : bTime;
        return safeB - safeA;
      });
  }, [allMeetings]);

  const overviewMentorRequests = useMemo(() => {
    const interviews = allMentorRequests.filter((row) => row.status !== 'PENDING');
    const combined = [...interviews, ...mentorMeetingOverviewRows];
    return combined.sort((a, b) => {
      const aTime = new Date(a.scheduledAt).getTime();
      const bTime = new Date(b.scheduledAt).getTime();
      const safeA = Number.isNaN(aTime) ? 0 : aTime;
      const safeB = Number.isNaN(bTime) ? 0 : bTime;
      return safeB - safeA;
    });
  }, [allMentorRequests, mentorMeetingOverviewRows]);
  const pendingLearnerRequests = useMemo(
    () => allLearnerRequests.filter((row) => row.status === 'PENDING'),
    [allLearnerRequests]
  );
  const pendingMentorRequests = useMemo(
    () => allMentorRequests.filter((row) => row.status === 'PENDING'),
    [allMentorRequests]
  );
  const showMentorEmptyMessage = pendingMentorRequests.length === 0 && pendingMentorMeetings.length === 0;

const handleUpdateStatus = async (
  id: string | number,
  newStatus: 'APPROVED' | 'REJECTED'
) => {
    try {
      const updated = await updateInterview(id, { status: newStatus });
      setAllInterviews((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: updated.status } : i))
      );
    } catch (err: any) {
      console.error('Failed to update status', err);
      alert(err.message || 'Failed to update status');
    }
};

const overviewRequestCard = useCallback(
  (row: OverviewInterviewRow) => {
    const ownerRoleLabel =
      row.ownerRole === 'mentor'
        ? 'Mentor'
        : row.ownerRole === 'admin'
        ? 'Admin'
        : 'Learner';
    return (
      <div
        key={`${row.id}-${row.updatedAt}`}
        className="glass-panel p-5 rounded-2xl border border-gray-700 hover:border-blue-500/40 transition-all flex flex-col justify-between gap-3"
      >
        <div className="flex justify-between items-start gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white line-clamp-2">
              {row.title}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              By <span className="font-medium text-gray-200">{row.ownerName}</span> ·{' '}
              <span className="text-emerald-300">{ownerRoleLabel}</span>
            </p>
          </div>
          <span
            className={`px-2 py-0.5 text-[10px] rounded-full border ${
              row.status === 'APPROVED'
                ? 'border-emerald-500/60 text-emerald-300 bg-emerald-900/40'
                : row.status === 'REJECTED'
                ? 'border-red-500/60 text-red-300 bg-red-900/40'
                : 'border-amber-500/60 text-amber-300 bg-amber-900/40'
            }`}
          >
            {row.status}
          </span>
        </div>
        <div className="text-xs text-gray-400">
          <div>
            <span className="text-gray-500">Scheduled:</span>{' '}
            {row.scheduledAt ? new Date(row.scheduledAt).toLocaleString() : 'Not set'}
          </div>
          <div>
            <span className="text-gray-500">Duration:</span>{' '}
            {row.durationMinutes} mins
          </div>
        </div>

        {row.status === 'PENDING' && (
          <div className="flex gap-2 mt-2">
            <Button
              variant="primary"
              onClick={() => handleUpdateStatus(row.id, 'APPROVED')}
              className="flex-1 py-1.5 text-xs"
            >
              Approve
            </Button>
            <Button
              variant="secondary"
              className="flex-1 py-1.5 text-xs bg-red-900/40 border-red-500/60 text-red-200 hover:bg-red-800/60"
              onClick={() => handleUpdateStatus(row.id, 'REJECTED')}
            >
              Reject
            </Button>
          </div>
        )}
      </div>
    );
  },
  [handleUpdateStatus]
);

const renderOverviewRequestSection = (
  title: string,
  rows: OverviewInterviewRow[],
  emptyText: string,
  options?: { showEmptyMessage?: boolean; extraCount?: number }
) => {
  const count = rows.length + (options?.extraCount ?? 0);
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <span className="text-xs text-gray-400">{count} records</span>
      </div>
      <div className="space-y-4">
        {rows.length === 0 ? (
          options?.showEmptyMessage ?? true ? (
            <div className="glass-panel p-4 rounded-2xl border border-dashed border-gray-700 text-xs text-gray-400 text-center">
              {emptyText}
            </div>
          ) : null
        ) : (
          rows.map(overviewRequestCard)
        )}
      </div>
    </section>
  );
};
  const getUserTypeLabel = (role?: User['role']) => {
    if (role === 'mentor') return 'Mentor';
    if (role === 'admin') return 'Admin';
    return 'Learner';
  };

  const ApiKeyField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}> = ({ label, value, onChange, placeholder }) => {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label className="block text-xs font-medium text-gray-300 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-blue-500 outline-none pr-10"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-2 flex items-center text-[10px] text-gray-400 hover:text-gray-200"
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
};

  const mapCreatedUser = (created: User): User => ({
    ...created,
    username: created.loginId,
    fullName: created.name,
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserLoginId.trim() || !newUserPassword.trim() || !newUserFullName.trim()) {
      alert('All fields are required.');
      return;
    }
    setCreatingUser(true);
    const roleLabel = newUserRole === 'mentor' ? 'Mentor' : 'Learner';
    try {
      const created = await createUser(
        newUserLoginId.trim(),
        newUserFullName.trim(),
        newUserPassword,
        newUserRole
      );
      setAdminUsers((prev) => [...prev, mapCreatedUser(created)]);
      setNewUserLoginId('');
      setNewUserFullName('');
      setNewUserPassword('');
      setCreateUserMessage(`${roleLabel} created successfully.`);
      window.setTimeout(() => setCreateUserMessage(null), 4000);
    } catch (err: any) {
      console.error(`Failed to create ${roleLabel.toLowerCase()}`, err);
      alert(err.message || `Failed to create ${roleLabel.toLowerCase()}`);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!user.id) return;
    if (!window.confirm(`Delete user ${user.fullName || user.username}?`)) {
      return;
    }
    try {
      await deleteUser(user.id);
      setAdminUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err: any) {
      console.error('Failed to delete user', err);
      alert(err.message || 'Failed to delete user');
    }
  };

  const handleResetPassword = async (user: User) => {
    const newPass = window.prompt(
      `Enter new password for ${user.fullName || user.username}:`
    );
    if (!newPass) return;
    if (!user.id) return;
    try {
      await changeUserPassword(user.id, newPass);
      setUserSuccessMsg('Password updated');
      setTimeout(() => setUserSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error('Failed to update password', err);
      alert(err.message || 'Failed to update password');
    }
  };

  const interviewHistoryRows = useMemo(() => {
    const rows = allInterviews.map((interview) => {
      const owner = adminUsers.find((u) => u.id === interview.userId);
      const candidateName =
        owner?.fullName || owner?.username || interview.createdBy || 'Unknown';
      return {
        ...interview,
        candidateName,
      };
    });
    return rows.sort((a, b) => {
      const aTime = new Date(a.scheduledAt).getTime();
      const bTime = new Date(b.scheduledAt).getTime();
      const safeA = Number.isNaN(aTime) ? 0 : aTime;
      const safeB = Number.isNaN(bTime) ? 0 : bTime;
      return safeB - safeA;
    });
  }, [allInterviews, adminUsers]);

  const meetingHistoryRows = useMemo(() => {
    return [...allMeetings].sort((a, b) => {
      const aTime = new Date(a.scheduledAt).getTime();
      const bTime = new Date(b.scheduledAt).getTime();
      const safeA = Number.isNaN(aTime) ? 0 : aTime;
      const safeB = Number.isNaN(bTime) ? 0 : bTime;
      return safeB - safeA;
    });
  }, [allMeetings]);

  const escapeCsvField = (value?: string | number) => {
    const text = value !== undefined && value !== null ? value.toString() : '';
    if (/[,\"\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const buildCsv = (rows: string[][]) => rows.map((row) => row.map(escapeCsvField).join(',')).join('\n');

  const toggleInterviewSelection = useCallback((id: string) => {
    setSelectedInterviewIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const toggleSelectAllInterviews = useCallback(() => {
    if (selectedInterviewIds.length === interviewHistoryRows.length) {
      setSelectedInterviewIds([]);
      return;
    }
    setSelectedInterviewIds(interviewHistoryRows.map((row) => String(row.id)));
  }, [interviewHistoryRows, selectedInterviewIds.length]);

  const toggleMeetingSelection = useCallback((id: string) => {
    setSelectedMeetingIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const toggleSelectAllMeetings = useCallback(() => {
    if (selectedMeetingIds.length === meetingHistoryRows.length) {
      setSelectedMeetingIds([]);
      return;
    }
    setSelectedMeetingIds(meetingHistoryRows.map((row) => String(row.id)));
  }, [meetingHistoryRows, selectedMeetingIds.length]);

  const buildInterviewPdf = useCallback((rows: InterviewRow[]) => {
    if (rows.length === 0) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Interview History', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    let cursor = 36;
    rows.forEach((entry, index) => {
      if (cursor > 270) {
        doc.addPage();
        cursor = 18;
      }
      doc.setFontSize(11);
      const titleLines = doc.splitTextToSize(`${index + 1}. ${entry.title}`, 180);
      titleLines.forEach((line) => {
        if (cursor > 270) {
          doc.addPage();
          cursor = 18;
        }
        doc.text(line, 14, cursor);
        cursor += 6;
      });
      doc.setFontSize(10);
      doc.text(`Candidate: ${entry.candidateName}`, 14, cursor);
      cursor += 6;
      doc.text(
        `Scheduled: ${
          entry.scheduledAt ? new Date(entry.scheduledAt).toLocaleString() : 'TBD'
        }`,
        14,
        cursor
      );
      cursor += 6;
      doc.text(`Status: ${entry.status}`, 14, cursor);
      cursor += 6;
      doc.text(`Session Seconds: ${entry.sessionSecondsUsed || 0}`, 14, cursor);
      cursor += 8;
    });
    doc.save(`interviews-history-${new Date().toISOString()}.pdf`);
  }, []);

  const handleDownloadAllInterviewsPdf = useCallback(() => {
    if (interviewHistoryRows.length === 0) {
      alert('No interviews to export.');
      return;
    }
    setInterviewExportingPdf(true);
    try {
      buildInterviewPdf(interviewHistoryRows);
    } catch (err) {
      console.error('Failed to generate interview PDF', err);
      alert('Failed to generate interview PDF');
    } finally {
      setInterviewExportingPdf(false);
    }
  }, [buildInterviewPdf, interviewHistoryRows]);

  const handleDownloadSelectedInterviewsPdf = useCallback(() => {
    if (selectedInterviewIds.length === 0) {
      alert('Select at least one interview.');
      return;
    }
    const rows = interviewHistoryRows.filter((row) =>
      selectedInterviewIds.includes(String(row.id))
    );
    if (rows.length === 0) {
      alert('No valid interviews selected.');
      return;
    }
    setInterviewExportingPdf(true);
    try {
      buildInterviewPdf(rows);
    } catch (err) {
      console.error('Failed to generate interview PDF', err);
      alert('Failed to generate interview PDF');
    } finally {
      setInterviewExportingPdf(false);
    }
  }, [buildInterviewPdf, interviewHistoryRows, selectedInterviewIds]);

  const downloadInterviewCsv = useCallback(() => {
    if (interviewHistoryRows.length === 0) {
      alert('No interviews available for export.');
      return;
    }
    setInterviewCsvExporting(true);
    try {
      const lines = [
        ['Title', 'Candidate', 'Scheduled', 'Status', 'Duration (mins)'],
        ...interviewHistoryRows.map((row) => [
          row.title,
          row.candidateName,
          row.scheduledAt ? new Date(row.scheduledAt).toLocaleString() : 'TBD',
          row.status,
          row.durationMinutes?.toString() || '0',
        ]),
      ];
      const csvContent = buildCsv(lines);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'interviews-history.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export interview CSV', err);
      alert('Failed to export CSV');
    } finally {
      setInterviewCsvExporting(false);
    }
  }, [interviewHistoryRows]);

  const buildMeetingPdf = useCallback((rows: Meeting[]) => {
    if (rows.length === 0) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Mentor Session History', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    let cursor = 36;
    rows.forEach((entry, index) => {
      if (cursor > 270) {
        doc.addPage();
        cursor = 18;
      }
      doc.setFontSize(11);
      doc.text(`${index + 1}. ${entry.technology}`, 14, cursor);
      cursor += 6;
      doc.setFontSize(10);
      doc.text(`Student: ${entry.studentName}`, 14, cursor);
      cursor += 6;
      doc.text(
        `Scheduled: ${
          entry.scheduledAt ? new Date(entry.scheduledAt).toLocaleString() : 'TBD'
        }`,
        14,
        cursor
      );
      cursor += 6;
      doc.text(`Meeting Key: ${entry.meetingKey}`, 14, cursor);
      cursor += 6;
      doc.text(`Status: ${entry.status}`, 14, cursor);
      cursor += 8;
    });
    doc.save(`mentor-sessions-history-${new Date().toISOString()}.pdf`);
  }, []);

  const handleDownloadAllMeetingsPdf = useCallback(() => {
    if (meetingHistoryRows.length === 0) {
      alert('No meetings to export.');
      return;
    }
    setMeetingExportingPdf(true);
    try {
      buildMeetingPdf(meetingHistoryRows);
    } catch (err) {
      console.error('Failed to generate meeting PDF', err);
      alert('Failed to generate meeting PDF');
    } finally {
      setMeetingExportingPdf(false);
    }
  }, [buildMeetingPdf, meetingHistoryRows]);

  const handleDownloadSelectedMeetingsPdf = useCallback(() => {
    if (selectedMeetingIds.length === 0) {
      alert('Select at least one meeting.');
      return;
    }
    const rows = meetingHistoryRows.filter((row) => selectedMeetingIds.includes(String(row.id)));
    if (rows.length === 0) {
      alert('No valid meetings selected.');
      return;
    }
    setMeetingExportingPdf(true);
    try {
      buildMeetingPdf(rows);
    } catch (err) {
      console.error('Failed to generate meeting PDF', err);
      alert('Failed to generate meeting PDF');
    } finally {
      setMeetingExportingPdf(false);
    }
  }, [buildMeetingPdf, meetingHistoryRows, selectedMeetingIds]);

  const downloadMeetingCsv = useCallback(() => {
    if (meetingHistoryRows.length === 0) {
      alert('No meetings available for export.');
      return;
    }
    setMeetingCsvExporting(true);
    try {
      const lines = [
        ['Mentor', 'Student', 'Technology', 'Scheduled', 'Status', 'Meeting Key'],
        ...meetingHistoryRows.map((row) => [
          row.mentorId,
          row.studentName,
          row.technology,
          row.scheduledAt ? new Date(row.scheduledAt).toLocaleString() : 'TBD',
          row.status,
          row.meetingKey,
        ]),
      ];
      const csvContent = buildCsv(lines);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'mentor-sessions-history.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export meeting CSV', err);
      alert('Failed to export CSV');
    } finally {
      setMeetingCsvExporting(false);
    }
  }, [meetingHistoryRows]);

  const handleDeleteInterview = useCallback(
    async (interview: SavedInterview) => {
      if (!window.confirm(`Delete interview "${interview.title}"?`)) return;
      try {
        await deleteInterview(interview.id);
        setAllInterviews((prev) => prev.filter((item) => item.id !== interview.id));
        setSelectedInterviewIds((prev) => prev.filter((id) => id !== String(interview.id)));
      } catch (err: any) {
        console.error('Failed to delete interview', err);
        alert(err.message || 'Failed to delete interview');
      }
    },
    []
  );

  const handleViewInterview = useCallback((row: InterviewRow) => {
    alert(
      `Title: ${row.title}\nCandidate: ${row.candidateName}\nScheduled: ${
        row.scheduledAt ? new Date(row.scheduledAt).toLocaleString() : 'TBD'
      }\nStatus: ${row.status}`
    );
  }, []);

  const handleViewMeeting = useCallback((meeting: Meeting) => {
    alert(
      `Technology: ${meeting.technology}\nStudent: ${meeting.studentName}\nScheduled: ${
        meeting.scheduledAt ? new Date(meeting.scheduledAt).toLocaleString() : 'TBD'
      }\nStatus: ${meeting.status}\nKey: ${meeting.meetingKey}`
    );
  }, []);

  const handleDeleteSelectedInterviews = useCallback(async () => {
    if (selectedInterviewIds.length === 0) return;
    if (!window.confirm('Delete selected interviews?')) return;
    setProcessingInterviewDeletion(true);
    try {
      for (const id of selectedInterviewIds) {
        await deleteInterview(id);
      }
      setAllInterviews((prev) =>
        prev.filter((item) => !selectedInterviewIds.includes(String(item.id)))
      );
    } catch (err: any) {
      console.error('Failed to delete selected interviews', err);
      alert(err.message || 'Failed to delete selected interviews');
    } finally {
      setProcessingInterviewDeletion(false);
      setSelectedInterviewIds([]);
      loadInterviews();
    }
  }, [selectedInterviewIds, loadInterviews]);

  const handleDeleteMeeting = useCallback(async (meeting: Meeting) => {
    if (!window.confirm(`Delete meeting ${meeting.meetingKey}?`)) return;
    try {
      await deleteMeetingAsAdmin(meeting.id);
      setAllMeetings((prev) => prev.filter((item) => item.id !== meeting.id));
      setSelectedMeetingIds((prev) => prev.filter((id) => id !== meeting.id));
    } catch (err: any) {
      console.error('Failed to delete meeting', err);
      alert(err.message || 'Failed to delete meeting');
    }
  }, []);

  const handleDeleteSelectedMeetings = useCallback(async () => {
    if (selectedMeetingIds.length === 0) return;
    if (!window.confirm('Delete selected meetings?')) return;
    setProcessingMeetingDeletion(true);
    try {
      for (const id of selectedMeetingIds) {
        await deleteMeetingAsAdmin(id);
      }
      setAllMeetings((prev) => prev.filter((item) => !selectedMeetingIds.includes(item.id)));
    } catch (err: any) {
      console.error('Failed to delete selected meetings', err);
      alert(err.message || 'Failed to delete selected meetings');
    } finally {
      setProcessingMeetingDeletion(false);
      setSelectedMeetingIds([]);
      loadMeetingHistory();
    }
  }, [selectedMeetingIds, loadMeetingHistory]);

  const handleAdminMeetingStatusUpdate = useCallback(
    async (meeting: Meeting, status: 'APPROVED' | 'REJECTED') => {
      try {
        await updateMeetingByAdmin(meeting.id, { status });
        setPendingMentorMeetings((prev) => prev.filter((item) => item.id !== meeting.id));
        loadPendingMentorMeetings();
        loadMeetingHistory();
      } catch (err: any) {
        console.error('Failed to update meeting status', err);
        alert(err.message || 'Failed to update meeting status');
      }
    },
    [loadMeetingHistory, loadPendingMentorMeetings]
  );



  const ProviderCard: React.FC<{
    id: AIProvider;
    name: string;
    description: string;
    active: boolean;
  }> = ({ id, name, description, active }) => (
    <label
      className={`w-full text-left cursor-pointer rounded-xl border px-4 py-4 flex gap-3 items-start
        transition-all duration-150
        ${active
          ? 'border-blue-500 bg-gray-800 shadow-md'
          : 'border-gray-700 bg-gray-900 hover:border-blue-400 hover:bg-gray-800'
        }`}
    >
      {/* Radio dot – like MCQ option */}
      <span
        className={`mt-1 h-4 w-4 rounded-full border flex items-center justify-center
          ${active ? 'border-blue-500' : 'border-gray-500'}`}
      >
        <span
          className={`h-2 w-2 rounded-full
            ${active ? 'bg-blue-500' : 'bg-transparent'}`}
        />
      </span>

      <div className="flex-1">
        <input
          type="radio"
          name="aiProvider"
          className="sr-only"
          value={id}
          checked={active}
          onChange={() => setSelectedProvider(id)}
        />

        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-semibold text-white">{name}</span>
        </div>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
    </label>
  );

  const adminTabs = [
    { id: 'OVERVIEW', label: 'Overview' },
    { id: 'PENDING_REQUESTS', label: 'Pending Requests' },
    { id: 'USERS', label: 'Users' },
    { id: 'SUPPORT', label: 'Support' },
    { id: 'INTERVIEW_HISTORY', label: 'Interview History' },
    { id: 'MENTOR_HISTORY', label: 'Mentor History' },
    { id: 'SETTINGS', label: 'Settings' },
  ] as const;


  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <Header onNavigate={onNavigate} onLogin={onLogin} onBack={onBack} />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 pb-16 pt-10">
        {/* Top bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Control Panel</h1>
            <p className="text-gray-400 text-sm mt-1">
              Review interview requests, manage users, and configure providers.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-900/50 text-emerald-300 border border-emerald-600/60">
              System Online
            </span>
            <Button variant="secondary" onClick={onLogout} className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
              </svg>
              Logout
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-800">
          {adminTabs.map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2 text-xs font-semibold tracking-wide ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-blue-300'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'OVERVIEW' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="glass-panel p-6 rounded-2xl border border-blue-500/40 bg-gradient-to-br from-blue-950/40 to-gray-900">
                <div className="text-blue-300 text-xs font-semibold uppercase mb-2">
                  Interviews Today
                </div>
                <div className="text-4xl font-bold text-white">{interviewsToday}</div>
                <p className="text-xs text-gray-400 mt-2">
                  Number of sessions scheduled for today.
                </p>
              </div>

              <div className="glass-panel p-6 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-950/40 to-gray-900">
                <div className="text-amber-300 text-xs font-semibold uppercase mb-2">
                  Pending Approvals
                </div>
                <div className="text-4xl font-bold text-white">{pendingCount}</div>
                <p className="text-xs text-gray-400 mt-2">
                  Requests waiting for your approval or rejection.
                </p>
              </div>

              <div className="glass-panel p-6 rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 to-gray-900">
                <div className="text-emerald-300 text-xs font-semibold uppercase mb-2">
                  Total Users
                </div>
                <div className="text-4xl font-bold text-white">{totalUsers}</div>
                <p className="text-xs text-gray-400 mt-2">
                  Active accounts that can book mock interviews.
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div className="flex gap-3 flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title or user..."
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2 items-start">
              {renderOverviewRequestSection(
                'Learner Requests',
                overviewLearnerRequests,
                'No learner requests found for the selected filters.'
              )}
              {renderOverviewRequestSection(
                'Mentor Requests',
                overviewMentorRequests,
                'No mentor requests found for the selected filters.'
              )}
            </div>
          </>
        )}

        {/* PENDING REQUESTS TAB */}
        {activeTab === 'PENDING_REQUESTS' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Pending Requests</h2>
              <span className="text-xs text-gray-400">
                {pendingLearnerRequests.length + pendingMentorRequests.length +
                  pendingMentorMeetings.length} pending total
              </span>
            </div>
            <div className="grid gap-6 lg:grid-cols-2 items-start">
              {renderOverviewRequestSection(
                'Learner Requests',
                pendingLearnerRequests,
                'No pending learner requests for the selected filters.'
              )}
              <div className="space-y-6">
                {renderOverviewRequestSection(
                  'Mentor Requests',
                  pendingMentorRequests,
                  'No pending mentor requests for the selected filters.',
                  { showEmptyMessage: showMentorEmptyMessage, extraCount: pendingMentorMeetings.length }
                )}
                <div className="space-y-4">
                  
                  {pendingMeetingsLoading && (
                    <div className="glass-panel p-4 rounded-2xl border border-gray-700 text-sm text-gray-400 text-center">
                      Loading pending mentor meetings...
                    </div>
                  )}
                  {!pendingMeetingsLoading && pendingMentorMeetings.length === 0 && (
                    <div className="glass-panel p-4 rounded-2xl border border-dashed border-gray-700 text-sm text-gray-400 text-center">
                      No mentor meetings awaiting approval.
                    </div>
                  )}
                  {!pendingMeetingsLoading &&
                    pendingMentorMeetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        className="glass-panel p-5 rounded-2xl border border-gray-700 hover:border-blue-500/40 transition-all space-y-2"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Technology</p>
                            <p className="text-lg font-semibold text-white">{meeting.technology}</p>
                          </div>
                          <span className="text-[11px] font-mono text-gray-500">{meeting.mentorId}</span>
                        </div>
                        <div className="text-sm text-gray-300">
                          Student: <span className="text-white">{meeting.studentName}</span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                          <span>
                            Scheduled:{' '}
                            {meeting.scheduledAt ? new Date(meeting.scheduledAt).toLocaleString() : 'TBD'}
                          </span>
                          <span>Status: {meeting.status}</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="primary"
                            className="py-1.5 px-4 text-xs"
                            onClick={() => handleAdminMeetingStatusUpdate(meeting, 'APPROVED')}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="secondary"
                            className="py-1.5 px-4 text-xs bg-red-900/40 border-red-500/60 text-red-200 hover:bg-red-800/60"
                            onClick={() => handleAdminMeetingStatusUpdate(meeting, 'REJECTED')}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUPPORT TAB */}
        {activeTab === 'SUPPORT' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1 text-white">Contact Support Inbox</h2>
                <p className="text-sm text-gray-400">
                  Every message submitted via the contact form is recorded here for your review.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Current support contact:{' '}
                  <span className="text-white">{supportPhone || 'Not configured'}</span>
                </p>
                <div className="flex gap-2 items-center mt-2">
                  <input
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-20 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs"
                    placeholder="+91"
                  />
                  <input
                    value={localNumber}
                    onChange={(e) => setLocalNumber(e.target.value)}
                    className="w-40 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs"
                    placeholder="Phone number"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {/* <Button
                  variant="secondary"
                  onClick={handleExportSubmissions}
                  disabled={contactSubmissions.length === 0 || exportingPdf}
                  className="text-xs uppercase tracking-wide"
                >
                  {exportingPdf ? 'Preparing PDF...' : 'Export Inbox PDF'}
                </Button> */}
                <Button
                  variant="primary"
                  onClick={handleUpdateSupportPhone}
                  disabled={supportSaving}
                  className="text-xs uppercase tracking-wide"
                >
                  {supportSaving ? 'Saving...' : 'Update Contact Number'}
                </Button>
                <button
                  type="button"
                  onClick={() => setWhatsappVisible((prev) => !prev)}
                  className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide px-3 py-2 rounded-full border border-emerald-400/30 hover:border-emerald-400 transition-colors"
                >
                  <svg className="w-4 h-4 text-emerald-300" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.04 2C6.49 2 2 6.48 2 12.02c0 1.93.52 3.72 1.43 5.26L2 22l4.94-1.35A9.987 9.987 0 0 0 12.04 22c5.54 0 10.04-4.48 10.04-9.98C22.08 6.48 17.58 2 12.04 2zm4.21 12.64c-.23.64-1.33 1.22-1.84 1.31-.49.08-1.11.14-1.7-.14-.96-.44-2-1.03-3.11-2.15-1.1-1.12-1.67-2.08-2.12-3.04-.3-.67.21-1.19.66-1.25.44-.05 1.37-.05 1.97.55.6.6.87 1.08 1.08 1.45.23.4.15.8.04.95-.12.17-.43.42-.69.64-.25.21-.5.44-.27.85.23.4 1.1 1.81 2.37 3.27 1.44 1.66 2.66 2.33 3.07 2.59.4.26.64.22.94.13.3-.09 1.84-.79 2.1-1.38.26-.6.26-1.11.18-1.21-.06-.1-.2-.16-.43-.28z" />
                  </svg>
                  {whatsappVisible ? 'Hide WhatsApp' : 'Show WhatsApp'}
                </button>
              </div>
            </div>
            {supportMessage && (
              <div className="text-xs text-emerald-300">{supportMessage}</div>
            )}
            {whatsappVisible && (
              <div className="text-emerald-300 text-xs font-mono">
                WhatsApp: {supportPhone || '4567892345'}
              </div>
            )}
            <div className="glass-panel sticky top-4 z-10 bg-gray-900 border border-gray-700 rounded-2xl p-4 flex flex-wrap items-center gap-2 justify-between">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="text-xs uppercase tracking-wide"
                  onClick={loadContactEntries}
                >
                  Refresh
                </Button>
                <Button
                  variant="success"
                  className="text-xs uppercase tracking-wide"
                  onClick={handleDownloadSelectedContactsPdf}
                  disabled={selectedContactIds.length === 0 || exportingPdf}
                >
                  {exportingPdf ? 'Preparing PDF...' : 'Download Selected (PDF)'}
                </Button>
                <Button
                  variant="danger"
                  className="text-xs uppercase tracking-wide"
                  onClick={handleDeleteSelectedContacts}
                  disabled={selectedContactIds.length === 0 || contactDeleting}
                >
                  Delete Selected
                </Button>
                <Button
                  variant="accent"
                  className="text-xs uppercase tracking-wide"
                  onClick={downloadContactCsv}
                  disabled={contactSubmissions.length === 0 || contactCsvExporting}
                >
                  {contactCsvExporting ? 'Exporting CSV...' : 'Download as Excel'}
                </Button>
              </div>
              <div className="text-xs text-gray-400">Records: {contactSubmissions.length}</div>
            </div>
            <div className="glass-panel rounded-2xl border border-gray-700 overflow-hidden">
              <div className="grid grid-cols-[48px_1.6fr_1fr_2fr_140px] text-xs uppercase text-gray-400 bg-gray-900/80 border-b border-gray-800 px-4 py-3 gap-3">
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={
                      contactSubmissions.length > 0 &&
                      selectedContactIds.length === contactSubmissions.length
                    }
                    onChange={toggleSelectAllContacts}
                  />
                </div>
                <div>Date</div>
                <div>Name</div>
                <div>Subject</div>
                <div className="text-right">Actions</div>
              </div>
              <div className="max-h-[460px] overflow-y-auto">
                {contactLoading && (
                  <div className="text-xs text-gray-400 py-10 text-center border-b border-gray-800">
                    Loading submissions...
                  </div>
                )}
                {!contactLoading && contactSubmissions.length === 0 && (
                  <div className="text-xs text-gray-400 py-10 text-center border-b border-gray-800">
                    No submissions yet. The contact form will populate here as soon as someone reaches out.
                  </div>
                )}
                {!contactLoading &&
                  contactSubmissions.length > 0 &&
                  contactSubmissions.map((entry) => (
                    <div
                      key={entry.id}
                      className="grid grid-cols-[48px_1.6fr_1fr_2fr_140px] items-start gap-3 border-b border-gray-800 px-4 py-3 text-sm text-gray-200 last:border-b-0"
                    >
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedContactIds.includes(entry.id)}
                          onChange={() => toggleContactSelection(entry.id)}
                        />
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(entry.createdAt).toLocaleString()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{entry.name}</div>
                        <div className="text-[11px] text-gray-500">{entry.email}</div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{entry.subject}</div>
                        <p className="text-xs text-gray-400 leading-snug">{entry.message}</p>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="secondary"
                          className="text-[10px] px-2 py-1"
                          onClick={() => handleViewContact(entry)}
                        >
                          View
                        </Button>
                        {/* <Button
                          variant="secondary"
                          className="text-[10px] px-2 py-1"
                          onClick={() => handleRequestContact(entry)}
                        >
                          Request
                        </Button> */}
                        <Button
                          variant="secondary"
                          className="text-[10px] px-2 py-1 bg-red-900/40 border-red-500/60 text-red-200 hover:bg-red-800/60"
                          onClick={() => handleDeleteContact(entry.id)}
                          disabled={contactDeleting}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            {contactActionMessage && (
              <div className="text-xs text-emerald-300">{contactActionMessage}</div>
            )}
            {viewingContact && (
              <div className="glass-panel rounded-2xl border border-gray-700 p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-emerald-400">
                      {viewingContact.subject}
                    </p>
                    <h3 className="text-lg font-semibold text-white">{viewingContact.name}</h3>
                    <p className="text-[11px] text-gray-500">{viewingContact.email}</p>
                  </div>
                  <Button
                    variant="secondary"
                    className="text-[10px] px-2 py-1"
                    onClick={() => setViewingContact(null)}
                  >
                    Close
                  </Button>
                </div>
                <p className="text-xs text-gray-400">
                  Submitted: {new Date(viewingContact.createdAt).toLocaleString()}
                </p>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                  {viewingContact.message}
                </p>
              </div>
            )}
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'USERS' && (
          <div className="space-y-6">
            <form
              onSubmit={handleCreateUser}
              className="space-y-4 glass-panel p-5 rounded-2xl border border-gray-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-white">Create Learner or Mentor</h2>
                  <p className="text-xs text-gray-400">
                    Use this form to add a new account for either a learner or mentor.
                  </p>
                </div>
                <span className="text-xs text-gray-400">Total users: {totalUsers}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <label className="text-xs text-gray-300 space-y-1">
                  Role
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as 'user' | 'mentor')}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="user">Learner</option>
                    <option value="mentor">Mentor</option>
                  </select>
                </label>
                <label className="text-xs text-gray-300 space-y-1">
                  Full Name
                  <input
                    type="text"
                    value={newUserFullName}
                    onChange={(e) => setNewUserFullName(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </label>
                <label className="text-xs text-gray-300 space-y-1">
                  Login ID
                  <input
                    type="text"
                    value={newUserLoginId}
                    onChange={(e) => setNewUserLoginId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </label>
                <label className="text-xs text-gray-300 space-y-1">
                  Temporary Password
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </label>
              </div>
              {createUserMessage && (
                <p className="text-xs text-emerald-300">{createUserMessage}</p>
              )}
              <Button
                type="submit"
                fullWidth
                className="py-2 text-sm"
                disabled={creatingUser}
              >
                {creatingUser
                  ? 'Creating...'
                  : `Create ${newUserRole === 'mentor' ? 'Mentor' : 'Learner'}`}
              </Button>
            </form>

            <div className="grid gap-6 md:grid-cols-2">
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-white">Learners</h3>
                  <span className="text-xs text-gray-400">{learners.length} records</span>
                </div>
                <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
                  {learners.length === 0 && (
                    <div className="glass-panel p-4 rounded-2xl border border-dashed border-gray-700 text-xs text-gray-400 text-center">
                      No learners yet.
                    </div>
                  )}
                  {learners.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between glass-panel px-4 py-2 rounded-xl border border-gray-700"
                    >
                      <div>
                        <div className="text-sm font-medium text-white">
                          {user.fullName || user.username}
                        </div>
                        <div className="text-xs text-gray-400">{user.loginId}</div>
                        <div className="text-xs text-gray-400">Learner</div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          className="text-xs px-3 py-1"
                          onClick={() => handleResetPassword(user)}
                        >
                          Reset Password
                        </Button>
                        <Button
                          variant="secondary"
                          className="text-xs px-3 py-1 bg-red-900/40 border-red-500/60 text-red-200 hover:bg-red-800/60"
                          onClick={() => handleDeleteUser(user)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-white">Mentors</h3>
                  <span className="text-xs text-gray-400">{mentors.length} records</span>
                </div>
                <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
                  {mentors.length === 0 && (
                    <div className="glass-panel p-4 rounded-2xl border border-dashed border-gray-700 text-xs text-gray-400 text-center">
                      No mentors yet.
                    </div>
                  )}
                  {mentors.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between glass-panel px-4 py-2 rounded-xl border border-gray-700"
                    >
                      <div>
                        <div className="text-sm font-medium text-white">
                          {user.fullName || user.username}
                        </div>
                        <div className="text-xs text-gray-400">{user.loginId}</div>
                        <div className="text-xs text-gray-400">Mentor</div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          className="text-xs px-3 py-1"
                          onClick={() => handleResetPassword(user)}
                        >
                          Reset Password
                        </Button>
                        <Button
                          variant="secondary"
                          className="text-xs px-3 py-1 bg-red-900/40 border-red-500/60 text-red-200 hover:bg-red-800/60"
                          onClick={() => handleDeleteUser(user)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

  
        {activeTab === 'INTERVIEW_HISTORY' && (
          <div className="space-y-4">
            <div className="glass-panel sticky top-4 z-10 bg-gray-900 border border-gray-700 rounded-2xl p-4 flex flex-wrap items-center gap-2 justify-between">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="text-xs uppercase tracking-wide"
                  onClick={() => {
                    setSelectedInterviewIds([]);
                    loadInterviews();
                  }}
                >
                  Refresh
                </Button>
                <Button
                  variant="success"
                  className="text-xs uppercase tracking-wide"
                  onClick={handleDownloadSelectedInterviewsPdf}
                  disabled={selectedInterviewIds.length === 0 || interviewExportingPdf}
                >
                  Download Selected (PDF)
                </Button>
                <Button
                  variant="danger"
                  className="text-xs uppercase tracking-wide"
                  onClick={handleDeleteSelectedInterviews}
                  disabled={selectedInterviewIds.length === 0 || processingInterviewDeletion}
                >
                  {processingInterviewDeletion ? 'Deleting...' : 'Delete Selected'}
                </Button>
                <Button
                  variant="accent"
                  className="text-xs uppercase tracking-wide"
                  onClick={downloadInterviewCsv}
                  disabled={interviewCsvExporting}
                >
                  {interviewCsvExporting ? 'Exporting CSV...' : 'Download as Excel'}
                </Button>
              </div>
              <div className="text-xs text-gray-400">Records: {interviewHistoryRows.length}</div>
            </div>
            <div className="glass-panel rounded-2xl border border-gray-700 overflow-hidden">
              <div className="grid grid-cols-[48px_1.5fr_1fr_1fr_1fr_140px] text-xs uppercase text-gray-400 bg-gray-900/80 border-b border-gray-800 px-4 py-3 gap-3">
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={
                      interviewHistoryRows.length > 0 &&
                      selectedInterviewIds.length === interviewHistoryRows.length
                    }
                    onChange={toggleSelectAllInterviews}
                  />
                </div>
                <div>Date</div>
                <div>Candidate</div>
                <div>Title</div>
                <div>Status</div>
                <div className="text-right">Actions</div>
              </div>
              <div className="max-h-[460px] overflow-y-auto">
                {interviewHistoryRows.length === 0 && (
                  <div className="text-xs text-gray-400 py-10 text-center border-b border-gray-800">
                    No interviews recorded yet.
                  </div>
                )}
                {interviewHistoryRows.map((row) => (
                  <div
                    key={`${row.id}-${row.updatedAt}`}
                    className="grid grid-cols-[48px_1.5fr_1fr_1fr_1fr_140px] items-center gap-3 border-b border-gray-800 px-4 py-3 text-sm text-gray-200 last:border-b-0"
                  >
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedInterviewIds.includes(String(row.id))}
                        onChange={() => toggleInterviewSelection(String(row.id))}
                      />
                    </div>
                    <div>
                      {row.scheduledAt
                        ? new Date(row.scheduledAt).toLocaleString()
                        : 'Not scheduled'}
                    </div>
                    <div className="text-gray-300">{row.candidateName}</div>
                    <div className="text-base font-semibold text-white line-clamp-1">{row.title}</div>
                    <div>
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded-full border ${
                          row.status === 'APPROVED'
                            ? 'border-emerald-500/60 text-emerald-300 bg-emerald-900/40'
                            : row.status === 'REJECTED'
                            ? 'border-red-500/60 text-red-300 bg-red-900/40'
                            : 'border-amber-500/60 text-amber-300 bg-amber-900/40'
                        }`}
                      >
                        {row.status}
                      </span>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="secondary"
                        className="text-[10px] px-2 py-1"
                        onClick={() => handleViewInterview(row)}
                      >
                        View
                      </Button>
                      <Button
                        variant="secondary"
                        className="text-[10px] px-2 py-1 bg-red-900/40 border-red-500/60 text-red-200 hover:bg-red-800/60"
                        onClick={() => handleDeleteInterview(row)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'MENTOR_HISTORY' && (
          <div className="space-y-4">
            <div className="glass-panel sticky top-4 z-10 bg-gray-900 border border-gray-700 rounded-2xl p-4 flex flex-wrap items-center gap-2 justify-between">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="text-xs uppercase tracking-wide"
                  onClick={loadMeetingHistory}
                  disabled={meetingsLoading}
                >
                  {meetingsLoading ? 'Refreshing...' : 'Refresh'}
                </Button>
                <Button
                  variant="success"
                  className="text-xs uppercase tracking-wide"
                  onClick={handleDownloadSelectedMeetingsPdf}
                  disabled={selectedMeetingIds.length === 0 || meetingExportingPdf}
                >
                  Download Selected (PDF)
                </Button>
                <Button
                  variant="danger"
                  className="text-xs uppercase tracking-wide"
                  onClick={handleDeleteSelectedMeetings}
                  disabled={selectedMeetingIds.length === 0 || processingMeetingDeletion}
                >
                  {processingMeetingDeletion ? 'Deleting...' : 'Delete Selected'}
                </Button>
                <Button
                  variant="accent"
                  className="text-xs uppercase tracking-wide"
                  onClick={downloadMeetingCsv}
                  disabled={meetingCsvExporting}
                >
                  {meetingCsvExporting ? 'Exporting CSV...' : 'Download as Excel'}
                </Button>
              </div>
              <div className="text-xs text-gray-400">Records: {meetingHistoryRows.length}</div>
            </div>
            <div className="glass-panel rounded-2xl border border-gray-700 overflow-hidden">
              <div className="grid grid-cols-[48px_1.2fr_1fr_1fr_1fr_1fr_140px] text-xs uppercase text-gray-400 bg-gray-900/80 border-b border-gray-800 px-4 py-3 gap-3">
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={
                      meetingHistoryRows.length > 0 &&
                      selectedMeetingIds.length === meetingHistoryRows.length
                    }
                    onChange={toggleSelectAllMeetings}
                  />
                </div>
                <div>Date</div>
                <div>Mentor</div>
                <div>Student</div>
                <div>Technology</div>
                <div>Status</div>
                <div className="text-right">Actions</div>
              </div>
              <div className="max-h-[520px] overflow-y-auto">
                {meetingHistoryRows.length === 0 && (
                  <div className="text-xs text-gray-400 py-10 text-center border-b border-gray-800">
                    No mentor sessions recorded yet.
                  </div>
                )}
                {meetingHistoryRows.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="grid grid-cols-[48px_1.2fr_1fr_1fr_1fr_1fr_140px] items-center gap-3 border-b border-gray-800 px-4 py-3 text-sm text-gray-200 last:border-b-0"
                  >
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedMeetingIds.includes(meeting.id)}
                        onChange={() => toggleMeetingSelection(meeting.id)}
                      />
                    </div>
                    <div>
                      {meeting.scheduledAt
                        ? new Date(meeting.scheduledAt).toLocaleString()
                        : 'Pending'}
                    </div>
                    <div className="text-gray-300">{meeting.mentorId || 'Mentor'}</div>
                    <div className="text-gray-300">{meeting.studentName}</div>
                    <div className="text-gray-300">{meeting.technology}</div>
                    <div>
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded-full border ${
                          meeting.status === 'APPROVED'
                            ? 'border-emerald-500/60 text-emerald-300 bg-emerald-900/40'
                            : meeting.status === 'REJECTED'
                            ? 'border-red-500/60 text-red-300 bg-red-900/40'
                            : 'border-amber-500/60 text-amber-300 bg-amber-900/40'
                        }`}
                      >
                        {meeting.status}
                      </span>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="secondary"
                        className="text-[10px] px-2 py-1"
                        onClick={() => handleViewMeeting(meeting)}
                      >
                        View
                      </Button>
                      <Button
                        variant="secondary"
                        className="text-[10px] px-2 py-1 bg-red-900/40 border-red-500/60 text-red-200 hover:bg-red-800/60"
                        onClick={() => handleDeleteMeeting(meeting)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* SETTINGS TAB */}
        {activeTab === 'SETTINGS' && (
  <form
    onSubmit={handleSaveSettings}
    className="grid grid-cols-1 md:grid-cols-2 gap-8"
  >
    {/* Provider selection */}
    <div>
      <h2 className="text-lg font-semibold mb-3">AI Provider</h2>
      <p className="text-xs text-gray-400 mb-3">
        Select one provider below. The selected card becomes the system default.
      </p>

      <div className="space-y-3">
        <ProviderCard
          id="OPENAI"
          name="OpenAI"
          description="Use GPT models (recommended for rich, conversational feedback)."
          active={selectedProvider === 'OPENAI'}
        />
        <ProviderCard
          id="GEMINI"
          name="Google Gemini"
          description="Use Gemini models for multilingual and Google-aligned responses."
          active={selectedProvider === 'GEMINI'}
        />
        <ProviderCard
          id="DEEPSEEK"
          name="DeepSeek"
          description="Use DeepSeek for efficient and cost-effective interview analysis."
          active={selectedProvider === 'DEEPSEEK'}
        />
      </div>
    </div>

    {/* API keys */}
    <div>
      <h2 className="text-lg font-semibold mb-3">API Keys</h2>
      <p className="text-xs text-gray-400 mb-3">
        These values are loaded from the backend. To change a key, clear the field,
        paste the new value and save.
      </p>

      <div className="space-y-3">
  <ApiKeyField
    label="OpenAI Key"
    value={openaiKey}
    onChange={handleOpenaiKeyChange}
    placeholder="sk-..."
  />

  <ApiKeyField
    label="Gemini Key"
    value={geminiKey}
    onChange={handleGeminiKeyChange}
    placeholder="AIza-..."
  />

  <ApiKeyField
    label="DeepSeek Key"
    value={deepSeekKey}
    onChange={handleDeepSeekKeyChange}
    placeholder="deepseek-..."
  />

  <ApiKeyField
    label="Deepgram Key (Audio)"
    value={deepgramKey}
    onChange={handleDeepgramKeyChange}
    placeholder="dg-..."
  />
</div>


      <div className="mt-4">
        <Button
          type="submit"
          fullWidth
          disabled={settingsSaving}
          className="py-2 text-sm"
        >
          {settingsSaving ? 'Saving...' : 'Save Settings'}
        </Button>
        {settingsMessage && (
          <p className="text-xs text-center mt-2 text-gray-300">
            {settingsMessage}
          </p>
        )}
      </div>
    </div>
  </form>
)}

      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
};
