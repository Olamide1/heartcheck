export interface User {
  id: string;
  email: string;
  name: string;
  nickname?: string;
  relationshipStartDate?: string | null;
  timezone: string;
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

export interface PatternAlert {
  id: string;
  coupleId: string;
  type: 'low_connection' | 'low_mood' | 'streak_achieved';
  message: string;
  suggestedAction: string;
  isRead: boolean;
  createdAt: string;
}

export interface GuidedExercise {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: 'connection' | 'stress_relief' | 'gratitude' | 'communication';
  instructions: string[];
  createdAt: string;
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
};

export type MainTabParamList = {
  Dashboard: undefined;
  CheckIn: undefined;
  Reports: undefined;
  Profile: undefined;
};
