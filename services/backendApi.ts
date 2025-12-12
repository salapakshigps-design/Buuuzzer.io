
import { AIProvider, SavedInterview, User, ContactSubmissionRecord, AdminSettings, Meeting, MeetingStatus } from "../types";

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

function getToken(): string | null {
  return localStorage.getItem('buuzzer_token');
}

function setToken(token: string) {
  localStorage.setItem('buuzzer_token', token);
}

export function clearAuth() {
  localStorage.removeItem('buuzzer_token');
}

function getAuthHeaders() {
  const token = getToken();
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function mapBackendUser(u: any): User {
  return {
    id: u.id,
    loginId: u.loginId ?? u.login_id,
    name: u.name,
    role: u.role,
    active: u.active,
    createdAt: u.created_at,
  };
}

function mapBackendInterview(i: any): SavedInterview {
  return {
    id: i.id,
    title: i.title,
    resumeText: i.resume_text || '',
    jobDescription: i.job_description || '',
    responseStyle: i.response_style || 'Simple English',
    maxLines: i.max_lines || 5,
    examples: i.examples || [],
    status: i.status,
    scheduledAt: i.scheduled_at,
    durationMinutes: i.duration_minutes,
    createdBy: i.user_login_id,
    userId: i.user_id,
    sessionSecondsUsed: i.session_seconds_used || 0
  };
}

function mapProviderToBackend(p: AIProvider): string {
  switch (p) {
    case 'GEMINI':
      return 'gemini';
    case 'DEEPSEEK':
      return 'deepseek';
    case 'OPENAI':
    default:
      return 'openai';
  }
}

export async function login(loginId: string, password: string): Promise<User> {
  const resp = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId, password }),
    });
  if (!resp.ok) {
    throw new Error('Invalid credentials');
  }
  const data = await resp.json();
  if (data.token) {
    setToken(data.token);
  }
  return mapBackendUser(data.user);
}

export async function getCurrentUser(): Promise<User | null> {
  const headers = getAuthHeaders();
  if (!headers) return null;
  const resp = await fetch(`${API_BASE}/api/auth/me`, { headers });
  if (!resp.ok) return null;
  const data = await resp.json();
  return mapBackendUser(data);
}

export async function listUsers(): Promise<User[]> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/users`, { headers });
  if (!resp.ok) throw new Error('Failed to load users');
  const data = await resp.json();
  return data.map(mapBackendUser);
}

export async function createUser(
  loginId: string,
  name: string,
  password: string,
  role: 'user' | 'mentor' = 'user'
): Promise<User> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/auth/admin/create-user`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ loginId, name, password, role }),
  });
  if (!resp.ok) throw new Error('Failed to create user');
  const data = await resp.json();
  return mapBackendUser(data);
}

export async function changeUserPassword(userId: number, newPassword: string): Promise<void> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/users/${userId}/password`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ newPassword }),
  });
  if (!resp.ok) throw new Error('Failed to change password');
}

export async function deleteUser(userId: number): Promise<void> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/users/${userId}`, {
    method: 'DELETE',
    headers,
  });
  if (!resp.ok) throw new Error('Failed to delete user');
}

export async function listInterviews(): Promise<SavedInterview[]> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/interviews`, { headers });
  if (!resp.ok) throw new Error('Failed to load interviews');
  const data = await resp.json();
  return data.map(mapBackendInterview);
}

export async function createInterview(payload: {
  title: string;
  jobDescription?: string;
  resumeText?: string;
  scheduledAt: string;
  durationMinutes: number;
}): Promise<SavedInterview> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/interviews`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: payload.title,
      jobDescription: payload.jobDescription,
      resumeText: payload.resumeText,
      scheduledAt: payload.scheduledAt,
      durationMinutes: payload.durationMinutes,
    }),
  });
  if (!resp.ok) throw new Error('Failed to create interview');
  const data = await resp.json();
  return mapBackendInterview(data);
}

export async function updateInterview(
  id: string | number,
  payload: {
    title?: string;
    jobDescription?: string;
    resumeText?: string;
    scheduledAt?: string;
    durationMinutes?: number;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED';
  }
): Promise<SavedInterview> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/interviews/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error('Failed to update interview');
  const data = await resp.json();
  return mapBackendInterview(data);
}

export async function deleteInterview(id: string | number): Promise<void> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/interviews/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!resp.ok) throw new Error('Failed to delete interview');
}

function mapMeeting(data: any): Meeting {
  return {
    id: data.id || data._id || '',
    mentorId:
      typeof data.mentorId === 'string'
        ? data.mentorId
        : data.mentorId?.toString?.() || '',
    technology: data.technology,
    studentName: data.studentName,
    scheduledAt: data.scheduledAt
      ? new Date(data.scheduledAt).toISOString()
      : '',
    meetingKey: data.meetingKey,
    status: data.status,
    transcript: data.transcript,
    createdAt: data.createdAt
      ? new Date(data.createdAt).toISOString()
      : undefined,
    updatedAt: data.updatedAt
      ? new Date(data.updatedAt).toISOString()
      : undefined,
  };
}

export async function createMeeting(payload: {
  technology: string;
  studentName: string;
  scheduledAt: string;
}): Promise<Meeting> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/meetings`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => null);
    throw new Error(body?.error || 'Failed to create meeting');
  }
  const meeting = await resp.json();
  return mapMeeting(meeting);
}

export async function listMyMeetings(): Promise<Meeting[]> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/meetings/mine`, {
    headers,
  });
  if (!resp.ok) throw new Error('Failed to load meetings');
  const data = await resp.json();
  return data.map(mapMeeting);
}

export async function listAllMeetingsForAdmin(): Promise<Meeting[]> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/meetings/admin`, { headers });
  if (!resp.ok) throw new Error('Failed to load meetings');
  const data = await resp.json();
  return data.map(mapMeeting);
}

export async function deleteMeetingAsAdmin(id: string): Promise<void> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/meetings/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!resp.ok) throw new Error('Failed to delete meeting');
}

export async function listPendingMeetingsForAdmin(): Promise<Meeting[]> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/meetings/pending`, {
    headers,
  });
  if (!resp.ok) throw new Error('Failed to load pending meetings');
  const data = await resp.json();
  return data.map(mapMeeting);
}

export async function joinMeeting(meetingKey: string): Promise<Meeting> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/meetings/join`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ meetingKey: meetingKey.trim().toUpperCase() }),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => null);
    throw new Error(body?.error || 'Failed to join meeting');
  }
  const meeting = await resp.json();
  return mapMeeting(meeting);
}

export async function updateMeetingStatus(
  id: string,
  status: MeetingStatus
): Promise<Meeting> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/meetings/${id}/status`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ status }),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => null);
    throw new Error(body?.error || 'Failed to update meeting status');
  }
  const meeting = await resp.json();
  return mapMeeting(meeting);
}

export async function updatePendingMeeting(
  id: string,
  payload: {
    scheduledAt?: string;
    technology?: string;
    studentName?: string;
  }
): Promise<Meeting> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/meetings/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => null);
    throw new Error(body?.error || 'Failed to update meeting');
  }
  const meeting = await resp.json();
  return mapMeeting(meeting);
}

export async function updateMeetingByAdmin(
  id: string,
  payload: { status?: 'APPROVED' | 'REJECTED'; scheduledAt?: string }
): Promise<Meeting> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/meetings/${id}/admin`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => null);
    throw new Error(body?.error || 'Failed to update meeting');
  }
  const data = await resp.json();
  return mapMeeting(data);
}

export async function getMeetingTranscript(id: string): Promise<string> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/meetings/${id}/transcript`, { headers });
  if (!resp.ok) {
    throw new Error('Failed to fetch transcript');
  }
  const data = await resp.json();
  return data.transcript || '';
}

export async function getMeetingById(id: string): Promise<Meeting> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/meetings/${id}`, { headers });
  if (!resp.ok) throw new Error('Failed to fetch meeting');
  const data = await resp.json();
  return mapMeeting(data);
}

// Admin settings

export interface AdminSettings {
  defaultProvider: AIProvider;
  hasOpenaiKey: boolean;
  hasGeminiKey: boolean;
  hasDeepseekKey: boolean;
  hasDeepgramKey: boolean;
  supportPhone?: string | null;
  openaiKeyMasked?: string | null;
  geminiKeyMasked?: string | null;
  deepseekKeyMasked?: string | null;
  deepgramKeyMasked?: string | null;
  openaiKeyLength?: number;
  geminiKeyLength?: number;
  deepseekKeyLength?: number;
  deepgramKeyLength?: number;
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/admin/settings`, { headers });
  if (!resp.ok) throw new Error('Failed to load admin settings');
  const data = await resp.json();
  const provider = (data.default_provider || 'openai') as string;
  let mapped: AIProvider = 'OPENAI';
  if (provider === 'gemini') mapped = 'GEMINI';
  if (provider === 'deepseek') mapped = 'DEEPSEEK';
  return {
    defaultProvider: mapped,
    hasOpenaiKey: !!data.has_openai_key,
    hasGeminiKey: !!data.has_gemini_key,
    hasDeepseekKey: !!data.has_deepseek_key,
    hasDeepgramKey: !!data.has_deepgram_key,
    supportPhone: data.support_phone || null,
    openaiKeyMasked: data.openai_key_masked || null,
    geminiKeyMasked: data.gemini_key_masked || null,
    deepseekKeyMasked: data.deepseek_key_masked || null,
    deepgramKeyMasked: data.deepgram_key_masked || null,
    openaiKeyLength: typeof data.openai_key_length === 'number' ? data.openai_key_length : null,
    geminiKeyLength: typeof data.gemini_key_length === 'number' ? data.gemini_key_length : null,
    deepseekKeyLength: typeof data.deepseek_key_length === 'number' ? data.deepseek_key_length : null,
    deepgramKeyLength: typeof data.deepgram_key_length === 'number' ? data.deepgram_key_length : null,
  };
}

export async function saveAdminSettings(payload: {
  defaultProvider?: AIProvider;
  openaiApiKey?: string;
  geminiApiKey?: string;
  deepseekApiKey?: string;
  deepgramApiKey?: string;
  supportPhone?: string;
}): Promise<AdminSettings> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');

  let backendProvider: string | undefined;
  if (payload.defaultProvider) {
    backendProvider = mapProviderToBackend(payload.defaultProvider);
  }

  const resp = await fetch(`${API_BASE}/api/admin/settings`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      defaultProvider: backendProvider,
      openaiApiKey: payload.openaiApiKey,
      geminiApiKey: payload.geminiApiKey,
      deepseekApiKey: payload.deepseekApiKey,
      deepgramApiKey: payload.deepgramApiKey,
      supportPhone: payload.supportPhone,
    }),
  });
  if (!resp.ok) throw new Error('Failed to save admin settings');
  return getAdminSettings();
}

export async function getDefaultProvider(): Promise<AIProvider> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/config/provider`, { headers });
  if (!resp.ok) throw new Error('Failed to load provider');
  const data = await resp.json();
  const provider = (data.defaultProvider || 'openai') as string;
  if (provider === 'gemini') return 'GEMINI';
  if (provider === 'deepseek') return 'DEEPSEEK';
  return 'OPENAI';
}

// AI generation via backend

export async function generateAIResponse(
  provider: AIProvider,
  messages: ChatMessage[]
): Promise<string> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/ai/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      provider: mapProviderToBackend(provider),
      messages,
    }),
  });
  if (!resp.ok) throw new Error('AI generation failed');
  const data = await resp.json();
  return data.output;
}

export async function getDeepgramKey(): Promise<string> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/deepgram/key`, { headers });
  if (!resp.ok) throw new Error('Deepgram key not available');
  const data = await resp.json();
  return data.deepgramApiKey;
}

export async function recordSessionUsage(interviewId: number, seconds: number) {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/interviews/${interviewId}/session`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ seconds })
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to record session usage');
  }
  return resp.json();
}

export async function getSupportContact(): Promise<string | null> {
  try {
    const resp = await fetch(`${API_BASE}/api/config/support-contact`);
    if (!resp.ok) throw new Error('Failed to load support contact');
    const data = await resp.json();
    return data.supportPhone || null;
  } catch (err) {
    console.error('Failed to retrieve support contact', err);
    return null;
  }
}

export async function resetAdminCredentials(payload: {
  loginId: string;
  password: string;
  name?: string;
  resetKey?: string;
}) {
  const resp = await fetch(`${API_BASE}/api/admin/reset-credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to reset admin credentials');
  }
  return resp.json();
}

export async function submitContactForm(payload: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const resp = await fetch(`${API_BASE}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to submit message');
  }
  return resp.json();
}

export async function listContactSubmissions(): Promise<ContactSubmissionRecord[]> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/admin/contact-submissions`, { headers });
  if (!resp.ok) throw new Error('Failed to load contact submissions');
  const data = await resp.json();
  return data.map((entry: any) => ({
    id: entry.id,
    name: entry.name,
    email: entry.email,
    subject: entry.subject,
    message: entry.message,
    createdAt: entry.created_at,
  }));
}

export async function deleteContactSubmission(id: string): Promise<void> {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}/api/admin/contact-submissions/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!resp.ok) throw new Error('Failed to delete contact submission');
}
