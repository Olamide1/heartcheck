export interface User {
  id: string;
  email: string;
  name: string;
  nickname?: string;
  relationshipStartDate?: string | null;
  timezone: string;
  notificationsEnabled: boolean;
  dailyReminderTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface Couple {
  id: string;
  partner1Id: string;
  partner2Id: string;
  createdAt: string;
  updatedAt: string;
}

export interface CheckIn {
  id: string;
  userId: string;
  coupleId: string;
  date: string;
  moodRating: number; // 1-10
  connectionRating: number; // 1-10
  reflection: string;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyReport {
  month: string;
  averageMood: number;
  averageConnection: number;
  happiestDays: CheckIn[];
  toughestDays: CheckIn[];
  suggestedFocus: string[];
  totalCheckIns: number;
  streakDays: number;
}

export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId: string;
  status: 'trial' | 'active' | 'canceled' | 'past_due';
  plan: 'monthly' | 'annual';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd?: string;
  createdAt: string;
  updatedAt: string;
}



export interface GuidedExercise {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: 'connection' | 'stress_relief' | 'gratitude' | 'communication' | 'intimacy' | 'conflict_resolution' | 'quality_time' | 'emotional_support';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string[];
  materialsNeeded: string[];
  benefits: string[];
  whenToUse?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseSession {
  id: string;
  userId: string;
  coupleId: string;
  exerciseId: string;
  completedAt: string;
  durationMinutes?: number;
  rating?: number;
  notes?: string;
  completedWithPartner: boolean;
  createdAt: string;
}

export interface ExerciseRecommendation {
  id: string;
  userId: string;
  coupleId: string;
  exerciseId: string;
  reason: string;
  priority: number;
  expiresAt: string;
  isCompleted: boolean;
  createdAt: string;
}

// Pattern Alerts System Types
export type PatternAlertType = 'low_connection' | 'low_mood' | 'streak_achieved' | 'pattern_detected' | 'relationship_insight';

export interface PatternAlert {
  id: string;
  coupleId: string;
  userId: string;
  type: PatternAlertType;
  title: string;
  message: string;
  suggestedAction: string;
  patternData?: any;
  severity: 'low' | 'medium' | 'high';
  isRead: boolean;
  isDismissed: boolean;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatternDetectionRule {
  id: string;
  ruleName: string;
  ruleType: PatternAlertType;
  description: string;
  conditions: any;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface PatternAlertPreferences {
  id: string;
  userId: string;
  alertType: PatternAlertType;
  enabled: boolean;
  notificationEnabled: boolean;
  emailEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PatternDetectionResult {
  shouldAlert: boolean;
  alertType: PatternAlertType;
  title: string;
  message: string;
  suggestedAction: string;
  severity: 'low' | 'medium' | 'high';
  patternData: any;
}

export type RootStackParamList = {
  Onboarding: undefined;
  Welcome: undefined;
  Login: undefined;
  AccountSetup: { inviteCode?: string };
  EmailConfirmation: { email: string; userData: any; inviteCode?: string };
  PairPartner: undefined;
  JoinPartner: undefined;
  Main: undefined;
  DailyCheckIn: undefined;
  Dashboard: undefined;
  MonthlyReport: undefined;
  Subscription: undefined;
  Settings: undefined;
  InvitePartner: undefined;
  ExerciseDetail: { exerciseId: string };
  Legal: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  CheckIn: undefined;
  Reports: undefined;
  Profile: undefined;
};
