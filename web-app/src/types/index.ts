export interface User {
  id: string;
  email?: string;
  name?: string;
  isGuest: boolean;
  personalityProfile?: PersonalityProfile;
  createdAt: Date;
}

export interface PersonalityProfile {
  id: string;
  userId: string;
  responses: number[];
  extraversion: number;
  agreeableness: number;
  conscientiousness: number;
  neuroticism: number;
  openness: number;
  completedAt: Date;
}

export interface InterviewQuestion {
  id: string;
  module: string;
  questionNumber: number;
  question: string;
}

export interface InterviewModule {
  name: string;
  questions: InterviewQuestion[];
  completedQuestions: number;
  totalQuestions: number;
}

export interface VideoRecording {
  id: string;
  questionId: string;
  userId: string;
  localURL?: string;
  cloudURL?: string;
  duration: number;
  fileSize: number;
  uploadStatus: UploadStatus;
  transcript?: string;
  recordedAt: Date;
  uploadedAt?: Date;
}

export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed' | 'retrying';

export interface InterviewSession {
  id: string;
  userId: string;
  modules: InterviewModule[];
  currentModuleIndex: number;
  currentQuestionIndex: number;
  completedRecordings: VideoRecording[];
  isCompleted: boolean;
  totalProgress: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface AppSettings {
  hasCompletedOnboarding: boolean;
  hasCompletedPersonalityTest: boolean;
  allowsBackgroundUploads: boolean;
  videoQuality: VideoQuality;
  autoSaveEnabled: boolean;
  afterDeathModeEnabled: boolean;
  whatsAppConnected: boolean;
  notificationsEnabled: boolean;
}

export type VideoQuality = 'low' | 'medium' | 'high';

export interface PersonalityTestQuestion {
  id: number;
  question: string;
  trait: 'extraversion' | 'agreeableness' | 'conscientiousness' | 'neuroticism' | 'openness';
  reversed: boolean;
}

export interface OnboardingSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  image?: string;
}

export interface LibraryFilter {
  module?: string;
  uploadStatus?: UploadStatus;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}