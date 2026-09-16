export interface LearningSettings {
  active_private: boolean;
  active_group: boolean;
  reply_in_groups: boolean;
}

export interface LearningService {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  createdAt: string;
}

export interface UnknownInquiry {
  id: string;
  question: string;
  source: string;
  timestamp: string;
  suggestedAnswer?: string;
  resolved: boolean;
}

export interface LearningSuggestion {
  id: string;
  conv_key: string;
  client_name: string;
  query: string;
  recommended_reply: string;
  confidence: number;
  timestamp: string;
}

export interface RotatingBroadcastSettings {
  messages: string[]; // up to 5 messages
  groups: string[];
  interval: number; // in minutes
  isRunning: boolean;
  next_send_in?: number; // seconds remaining
  currentMessageIndex?: number;
}

export interface RotatingBroadcastLog {
  id: string;
  timestamp: string;
  status: 'success' | 'failed';
  group: string;
  messagePreview: string;
  info?: string;
}

export interface SearchLinksProgress {
  isScanning: boolean;
  currentChat: string;
  scannedCount: number;
  totalFound: number;
  keyword: string;
  depth: 'fast' | 'medium' | 'full';
}

export interface DiscoveredLink {
  id: string;
  url: string;
  title: string;
  dialogTitle: string;
  messageSnippet: string;
  dateFound: string;
  membersCount?: number;
  selected?: boolean;
}

export interface TelegramGlobalResult {
  id: string;
  title: string;
  username: string;
  url: string;
  type: 'group' | 'channel' | 'bot';
  membersCount: number;
  isVerified: boolean;
  description: string;
  alreadyJoined?: boolean;
  isJoining?: boolean;
}

export interface AdvancedJoinStats {
  success: number;
  alreadyJoined: number;
  failed: number;
  total: number;
  currentProgressPercent: number;
  remaining: number;
}

export interface FailureBreakdown {
  floodWait: number;
  floodWaitSeconds?: number;
  expiredLink: number;
  closedGroup: number;
  adminApproval: number;
}

export type AutoJoinStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'completed';

export interface AutoJoinLog {
  id: string;
  timestamp: string;
  url: string;
  status: 'success' | 'already_joined' | 'failed';
  reason?: string;
}

export interface DirectJoinStatus {
  enabled: boolean;
  minInterval: number; // 60s
  maxJoinsPerHour: number; // 15
  joinsThisHour: number;
  totalSeenLinks: number;
  totalAutoJoined: number;
  lastJoinedGroup?: string;
  lastJoinTime?: string;
}

export interface DirectJoinEvent {
  id: string;
  timestamp: string;
  type: 'detected' | 'joined' | 'skipped' | 'rate_limited';
  sourceChat: string;
  groupUrl: string;
  note: string;
}

export type AutoReplyScope = 'all' | 'private' | 'groups';
export type AutoReplyMatchType = 'contains' | 'exact' | 'regex';

export interface AutoReplyRule {
  id: string;
  trigger: string;
  reply: string;
  scope: AutoReplyScope;
  matchType: AutoReplyMatchType;
  enabled: boolean;
  usageCount: number;
  lastUsed?: string;
}

export type SanitizeMode = 'salam' | 'skip' | 'sanitize' | 'purify';

export interface MonitoringSettings {
  textMessage: string;
  images: string[];
  sendMode: 'selected' | 'all';
  selectedGroups: string[];
  sanitizeMode: SanitizeMode;
  sendType: 'immediate' | 'scheduled';
  scheduleIntervalMinutes: number;
  workHoursStart: string;
  workHoursEnd: string;
  watchWords: string[];
}

export interface AcademicAnalysis {
  id: string;
  title: string;
  summary: string;
  keyConcepts: string[];
  examQuestions: {
    question: string;
    answer: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }[];
  createdAt: string;
}

export interface AcademicPaperAnalysis {
  title: string;
  executiveSummary: string;
  methodology: string;
  keyFindings: string[];
  citations: string[];
  citationFormat: string;
}

export interface DocumentFormatSettings {
  fontFamily: string;
  fontSize: number;
  lineSpacing: number;
  marginSize: 'normal' | 'thesis' | 'compact';
  includeTableOfContents: boolean;
  includePageNumbers: boolean;
  universityStandard: string;
}

export interface AcademicDocument {
  id: string;
  name: string;
  size: string;
  format: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'html';
  convertedDate: string;
  status: 'ready' | 'processing';
}
