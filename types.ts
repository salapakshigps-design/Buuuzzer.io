export type AIProvider = 'GEMINI' | 'OPENAI' | 'DEEPSEEK';

export interface User {
  // Backend-authenticated fields
  id?: number;
  loginId?: string;
  name?: string;
  role?: 'admin' | 'user' | 'mentor';
  active?: boolean;
  createdAt?: string | number;

  // Legacy local-only fields (used in older admin dashboard logic)
  username?: string;
  fullName?: string;
  password?: string;
}

export interface ExamplePair {
  question: string;
  answer: string;
}

export interface UserPreferences {
  resumeText: string;
  jobDescription: string;
  responseStyle: string;
  maxLines: number;
  examples: ExamplePair[];
  aiProvider: AIProvider;
  interviewId: number;
  durationMinutes: number;
  sessionSecondsUsed: number;
  scheduledAt: string;
}

export type InterviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface SavedInterview {
  id: number | string;
  title: string;
  resumeText: string;
  jobDescription: string;
  responseStyle: string;
  maxLines: number;
  examples: ExamplePair[];
  status: InterviewStatus;
  scheduledAt: string; // ISO Date String
  durationMinutes: number; // Duration in minutes
  sessionSecondsUsed: number;
  createdBy?: string; // loginId
  userId?: number;
}

export type MeetingStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED';

export interface Meeting {
  id: string;
  mentorId: string;
  technology: string;
  studentName: string;
  scheduledAt: string;
  meetingKey: string;
  status: MeetingStatus;
  transcript?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InterviewResponse {
  id: string;
  questionContext: string;
  answer: string;
  timestamp: Date;
  isLoading?: boolean;
}

export enum AppState {
  LANDING = 'LANDING',
  DASHBOARD = 'DASHBOARD',
  SESSION = 'SESSION',
  FEATURES = 'FEATURES',
  HOW_IT_WORKS = 'HOW_IT_WORKS',
  PRIVACY = 'PRIVACY',
  TERMS = 'TERMS',
  CONTACT = 'CONTACT',
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  MENTOR_DASHBOARD = 'MENTOR_DASHBOARD',
  JOIN_MEETING = 'JOIN_MEETING',
  MEETING_TRANSCRIPTION_MENTOR = 'MEETING_TRANSCRIPTION_MENTOR',
  MEETING_TRANSCRIPTION_LEARNER = 'MEETING_TRANSCRIPTION_LEARNER',
  USER_LOGIN = 'USER_LOGIN',
  ADMIN_RESET_PASSWORD = 'ADMIN_RESET_PASSWORD'
}

export interface ContactSubmissionRecord {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export interface AdminSettings {
  defaultProvider: AIProvider;
  hasOpenaiKey: boolean;
  hasGeminiKey: boolean;
  hasDeepseekKey: boolean;
  hasDeepgramKey: boolean;
  supportPhone?: string | null;
}
