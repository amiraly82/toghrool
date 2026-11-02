export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  coupleCode: string;
  partnerEmail: string | null;
  partnerUid: string | null;
  coupleId: string | null;
  passwordHash?: string;
  isCustomUser?: boolean;
  photoURL?: string;
  gender?: 'female' | 'male';
  onboardingCompleted?: boolean;
  onboardingHealthData?: FemaleOnboardingHealthData;
  isOnline?: boolean;
  lastActiveAt?: number;
}

export interface FemaleOnboardingHealthData {
  cycleRegularity: 'regular' | 'irregular' | 'unknown';
  contraceptionIntent: 'not_in_relationship' | 'preventing';
  contraceptionMethod?: 'condom' | 'natural' | 'pills' | 'iud' | 'emergency' | 'other';
  fertilityAwareness?: 'yes_less_stress' | 'unaware_active' | 'dont_know_safe_days';
  healthConditions: string[];
  heightCm: number;
  weightKg: number;
  periodLength: number;
  cycleLength: number;
  lastPeriodStartDate: string; // YYYY-MM-DD
  bmi?: number;
  completedAt?: string;
}

export interface CoupleSpace {
  id: string;
  partner1Uid: string;
  partner1Email: string;
  partner1Name: string;
  partner2Uid: string | null;
  partner2Email: string | null;
  partner2Name: string | null;
  createdAt: any;
}

export interface LinkPreview {
  title: string;
  description: string;
  image: string;
  url: string;
}

export type WishlistCategory = 'place' | 'buy' | 'trip' | 'book' | 'movie';

export interface WishlistItem {
  id: string;
  coupleId: string;
  title: string;
  category: string;
  description: string;
  link: string;
  linkPreview: LinkPreview | null;
  date: string | null; // ISO string YYYY-MM-DD for trips / calendar
  progress: number; // 0 to 100
  isCompleted: boolean;
  completedAt: any;
  createdBy: string;
  createdByName: string;
  createdAt: any;
}

export interface Poke {
  id: string;
  coupleId: string;
  senderUid: string;
  senderName: string;
  recipientUid: string;
  message: string;
  itemId: string;
  itemTitle: string;
  createdAt: any;
  read: boolean;
}

export interface UserPeriodSettings {
  uid: string;
  cycleLengthMin: number;
  cycleLengthMax: number;
  cycleLengthTypical: number;
  periodLength: number;
  lastPeriodStartDate: string;
  pmsNotificationEnabled: boolean;
  pmsNotificationDaysBefore: number;
  showPmsPredictions: boolean;
  goalMode?: 'track' | 'pregnancy' | 'prevention';
  birthDate?: string;
  updatedAt?: any;
}

export type CycleGoalMode = 'track' | 'pregnancy' | 'prevention';

export interface PeriodSharingSettings {
  sharePhase: boolean;
  shareNextPeriod: boolean;
  shareFertileWindow: boolean;
  shareFlow: boolean;
  shareMood: boolean;
  shareSymptoms: boolean;
  shareSex: boolean;
  shareTests: boolean;
  shareNotes: boolean;
  allowPartnerLogging: boolean;
}

export interface ImpoPeriodSettings {
  trackerOwnerUid?: string | null;
  isOwner?: boolean;
  allowPartnerLogging?: boolean;
  cycleLength: number;
  periodLength: number;
  lastPeriodStartDate: string;
  goalMode: CycleGoalMode;
  birthDate?: string;
  cycleHistory?: Array<{ startDate: string; periodLength: number; cycleLength?: number }>;
  viewMode?: 'circular' | 'flat';
}

export interface ImpoDailyLog {
  id: string;
  date: string; // YYYY-MM-DD
  isPeriodDay: boolean;
  isPeriodStart?: boolean;
  flow?: 'spotting' | 'light' | 'medium' | 'heavy' | 'none';
  moods?: string[];
  symptoms?: string[];
  discharge?: 'clear' | 'creamy' | 'sticky' | 'watery' | 'none';
  sex?: 'protected' | 'unprotected' | 'none';
  notes?: string;
  waterGlasses?: number;
  ovulationTestResult?: 'negative' | 'positive_weak' | 'positive_peak' | 'none';
  pregnancyTestResult?: 'negative' | 'positive' | 'none';
  sharePregnancyTestWithPartner?: boolean;
  loggedByUid?: string;
  loggedByName?: string;
  createdAt?: any;
}

export interface MemoryReaction {
  emoji: string;
  uid: string;
  userName: string;
}

export interface MemoryComment {
  id: string;
  memoryId: string;
  coupleId: string;
  uid: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: any;
}

export interface Memory {
  id: string;
  coupleId: string;
  title: string;
  date: string; // format (e.g. YYYY-MM-DD or Jalali date string)
  imageUrl: string;
  rawImageUrl?: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: any;
  reactions?: MemoryReaction[];
  comments?: MemoryComment[];
}

export interface PrivateExpense {
  id: string;
  userId: string;
  amount: number;
  category: string;
  description: string;
  date: string; // YYYY-MM-DD
  type: 'expense' | 'income';
  createdAt: any;
}

export interface PrivateBudget {
  userId: string;
  budgets: { [category: string]: number };
  monthlyIncomeGoal: number;
  updatedAt: any;
}


