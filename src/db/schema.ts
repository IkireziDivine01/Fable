/**
 * Fable RxDB Schema (Offline-First, Multi-Device)
 * All data syncs bidirectionally with Supabase PostgreSQL
 */

import { RxJsonSchema, RxCollection, RxDatabase } from 'rxdb';

const TIMESTAMP_MIN = 0;
const TIMESTAMP_MAX = 32503680000000; // Year 3000

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

export interface UserProfile {
  id: string;
  role: 'parent' | 'kid' | 'elder';
  email?: string;
  name?: string;
  localPin?: string;
  householdId: string;
  createdAt: number;
  updatedAt?: number;
}

export interface Theme {
  id: string;
  name: string;
  description?: string;
  isSystemTheme: 0 | 1; // SC38 fix: indexed boolean → integer; required in schema
  createdBy?: string;
  householdId: string;
  color?: string;
  createdAt: number;
}

export interface Story {
  id: string;
  householdId: string;
  title: string;
  authorId: string;
  status: 'draft' | 'published';
  audioUrl?: string;
  audioSize?: number;
  transcript?: string;
  recordedAt?: number;
  attribution?: string;
  isOriginal?: boolean;
  createdAt: number;
  updatedAt?: number;
  syncedToCloud: 0 | 1; // SC38 fix: indexed boolean → integer; required in schema
}

export interface StorySentence {
  id: string;
  storyId: string;
  sentenceText: string;
  sentenceOrder: number;
  kinyarwandaText?: string;
  etymologyNote?: string;
  themeId?: string;
  themeLabel?: string;
  elderTalkingPoints?: string;
  childPrompt?: string;
  createdAt: number;
}

export interface GatewayInstance {
  id: string;
  householdId: string;
  storyId: string;
  sentenceId: string;
  kidId: string;
  reachedAt: number;
  deviceFingerprint?: string;
  isLocked: 0 | 1;    // SC38 fix: indexed boolean → integer
  isVerified: 0 | 1;  // SC38 fix: indexed boolean → integer
  verifiedBy?: string;
  verifiedAt?: number;
  syncedToCloud?: 0 | 1; // SC38 fix: indexed boolean → integer
  lastModified?: number;
  createdAt: number;
}

export type InteractionEventType =
  | 'STORY_STARTED'
  | 'STORY_COMPLETED'
  | 'GATEWAY_REACHED'
  | 'GATEWAY_VERIFIED'
  | 'QUESTION_ASKED'
  | 'TRANSLATION_VIEWED';

export interface InteractionLog {
  id: string;
  householdId: string;
  eventType: InteractionEventType;
  actorId: string;
  storyId?: string;
  gatewayId?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
  syncedToCloud?: boolean; // Not indexed — boolean is fine here
}

export interface HouseholdGoal {
  id: string;
  householdId: string;
  createdBy?: string;
  goalType: 'TOGETHER_TIME_MINUTES';
  targetMinutes: number;
  weekStartDate: string;
  weekEndDate?: string;
  currentMinutes?: number;
  isCompleted?: boolean; // Not indexed — boolean is fine here
  completedAt?: number;
  createdAt?: number;
}

export interface KidQuestion {
  id: string;
  householdId: string;
  kidId: string;
  storyId?: string;
  questionText: string;
  questionType?: 'GATEWAY_PROMPT' | 'TRANSLATION' | 'GENERAL';
  answeredBy?: string;
  answerText?: string;
  answeredAt?: number;
  createdAt: number;
  syncedToCloud?: 0 | 1; // SC38 fix: indexed boolean → integer
}

export interface RecentStorySummary {
  storyId: string;
  storyTitle: string;
  readAt: number;
}

export interface UnansweredQuestionSummary {
  questionId: string;
  question: string;
  askedAt: number;
}

export interface ParentActivity {
  id: string;
  householdId: string;
  childId: string;
  storiesReadThisWeek?: number;
  gatewaysCompletedThisWeek?: number;
  togetherTimeMinutes?: number;
  recentStories?: RecentStorySummary[];
  unansweredQuestions?: UnansweredQuestionSummary[];
  lastUpdated: number;
  syncedToCloud?: boolean; // Not indexed — boolean is fine here
}

export interface SyncState {
  id: string;
  collectionName: string; // SC17 fix: 'collection' is a reserved RxDB top-level field name
  lastSyncedAt: number;
  isOnline?: boolean;
  failedAttempts?: number;
  lastError?: string;
}

export interface AudioAttachment {
  id: string;
  storyId: string;
  audioBlob: string;
  mimeType: string;
  duration: number;
  cloudUrl?: string;
  uploadedAt?: number;
  uploadedToCloud?: 0 | 1; // SC38 fix: indexed boolean → integer
  createdAt: number;
}

// ============================================================================
// USER PROFILES (Parent, Kid, Elder)
// ============================================================================

export const userSchema: RxJsonSchema<UserProfile> = {
  title: 'User Profile',
  version: 0,
  type: 'object',
  primaryKey: 'id',
  properties: {
    id: { type: 'string', maxLength: 36 },
    role: { type: 'string', enum: ['parent', 'kid', 'elder'], maxLength: 10 },
    email: { type: 'string', maxLength: 255 },
    name: { type: 'string', maxLength: 100 },
    localPin: { type: 'string', maxLength: 10 }, // 4-digit PIN for local auth
    householdId: { type: 'string', maxLength: 36 }, // Links all family members
    createdAt: {
      type: 'integer',
      multipleOf: 1,
      minimum: TIMESTAMP_MIN,
      maximum: TIMESTAMP_MAX,
    },
    updatedAt: {
      type: 'integer',
      multipleOf: 1,
      minimum: TIMESTAMP_MIN,
      maximum: TIMESTAMP_MAX,
    },
  },
  required: ['id', 'role', 'householdId', 'createdAt'],
  indexes: ['householdId', 'role', 'createdAt'],
};

// ============================================================================
// THEMES (System + User-Created)
// ============================================================================

export const themeSchema: RxJsonSchema<Theme> = {
  title: 'Cultural Themes',
  version: 0,
  type: 'object',
  primaryKey: 'id',
  properties: {
    id: { type: 'string', maxLength: 36 },
    name: { type: 'string', maxLength: 100 },
    description: { type: 'string', maxLength: 500 },

    // SC38 fix: was { type: 'boolean' } — indexed booleans must be integers
    isSystemTheme: { type: 'integer', multipleOf: 1, minimum: 0, maximum: 1 },

    createdBy: { type: 'string', maxLength: 36 },
    householdId: { type: 'string', maxLength: 36 },
    color: { type: 'string', maxLength: 7 },

    createdAt: {
      type: 'integer',
      multipleOf: 1,
      minimum: TIMESTAMP_MIN,
      maximum: TIMESTAMP_MAX,
    },
  },
  required: ['id', 'name', 'householdId', 'createdAt', 'isSystemTheme'],
  indexes: ['householdId', 'isSystemTheme'],
};

// ============================================================================
// STORIES (Text + Audio with Theme Tags)
// ============================================================================

export const storySchema: RxJsonSchema<Story> = {
  title: 'Story',
  version: 0,
  type: 'object',
  primaryKey: 'id',
  properties: {
    id: { type: 'string', maxLength: 36 },
    householdId: { type: 'string', maxLength: 36 },
    title: { type: 'string', maxLength: 500 },
    authorId: { type: 'string', maxLength: 36 }, // Elder ID
    status: { type: 'string', enum: ['draft', 'published'], maxLength: 10 },

    // Audio properties
    audioUrl: { type: 'string', maxLength: 2000 }, // URL to Supabase Storage
    audioSize: { type: 'integer', multipleOf: 1 }, // Bytes, for offline sync decisions
    transcript: { type: 'string', maxLength: 50000 }, // Full transcript from audio
    recordedAt: { type: 'integer', multipleOf: 1 }, // When audio was recorded

    // Attribution
    attribution: { type: 'string', maxLength: 500 }, // "Passed down from grandmother in Muhanga"
    isOriginal: { type: 'boolean' }, // Not indexed — stays boolean

    // Meta
    createdAt: {
      type: 'integer',
      multipleOf: 1,
      minimum: TIMESTAMP_MIN,
      maximum: TIMESTAMP_MAX,
    },
    updatedAt: {
      type: 'integer',
      multipleOf: 1,
      minimum: TIMESTAMP_MIN,
      maximum: TIMESTAMP_MAX,
    },
    // SC38 fix: was { type: 'boolean' } — indexed booleans must be integers
    syncedToCloud: { type: 'integer', multipleOf: 1, minimum: 0, maximum: 1 },
  },
  required: ['id', 'householdId', 'title', 'authorId', 'status', 'createdAt', 'syncedToCloud'],
  indexes: ['householdId', 'status', 'authorId', 'syncedToCloud'],
};

// ============================================================================
// STORY SENTENCES (With Theme Tags for Gateways)
// ============================================================================

export const storySentenceSchema: RxJsonSchema<StorySentence> = {
  title: 'Story Sentence',
  version: 0,
  type: 'object',
  primaryKey: 'id',
  properties: {
    id: { type: 'string', maxLength: 36 },
    storyId: { type: 'string', maxLength: 36 }, // FK to story
    sentenceText: { type: 'string', maxLength: 5000 },
    sentenceOrder: {
      type: 'integer',
      multipleOf: 1,
      minimum: 0,
      maximum: 1000000,
    }, // 0, 1, 2... for reading order

    // Kinyarwanda translation/etymology
    kinyarwandaText: { type: 'string', maxLength: 5000 }, // Optional translation
    etymologyNote: { type: 'string', maxLength: 2000 }, // Cultural/linguistic note

    // Theme tagging (triggers Guarded Gateway)
    // default: '' required because themeId is indexed but optional (no theme = empty string)
    themeId: { type: 'string', maxLength: 36, default: '' }, // References Theme.id
    themeLabel: { type: 'string', maxLength: 100 }, // Denormalized: "Ubuntu", "Ubwiyunge"

    // Talking points for Elder (shown when gateway is hit)
    elderTalkingPoints: { type: 'string', maxLength: 5000 }, // Multi-line explanation
    childPrompt: { type: 'string', maxLength: 1000 }, // What kid should ask elder

    createdAt: {
      type: 'integer',
      multipleOf: 1,
      minimum: TIMESTAMP_MIN,
      maximum: TIMESTAMP_MAX,
    },
  },
  required: ['id', 'storyId', 'sentenceText', 'sentenceOrder', 'createdAt'],
  indexes: ['storyId', 'sentenceOrder', 'themeId'],
};

// ============================================================================
// GUARDED GATEWAY INSTANCES (Core Collaboration Mechanic)
// ============================================================================

export const gatewayInstanceSchema: RxJsonSchema<GatewayInstance> = {
  title: 'Guarded Gateway Instance',
  version: 0,
  type: 'object',
  primaryKey: 'id',
  properties: {
    id: { type: 'string', maxLength: 36 },
    householdId: { type: 'string', maxLength: 36 },
    storyId: { type: 'string', maxLength: 36 },
    sentenceId: { type: 'string', maxLength: 36 }, // Which sentence has the gateway

    // Kid's reading session
    kidId: { type: 'string', maxLength: 36 },
    reachedAt: { type: 'integer', multipleOf: 1 }, // When kid hit this gateway
    deviceFingerprint: { type: 'string', maxLength: 256 }, // Which device kid is on

    // Gateway state — SC38 fix: all three were boolean and are indexed
    isLocked: { type: 'integer', multipleOf: 1, minimum: 0, maximum: 1 },
    isVerified: { type: 'integer', multipleOf: 1, minimum: 0, maximum: 1 },
    verifiedBy: { type: 'string', maxLength: 36 }, // Elder ID who verified (null if not yet)
    verifiedAt: { type: 'integer', multipleOf: 1 }, // Timestamp of verification

    // Offline metadata
    // default: 0 required because syncedToCloud is indexed but optional
    syncedToCloud: { type: 'integer', multipleOf: 1, minimum: 0, maximum: 1, default: 0 }, // SC38 fix
    lastModified: { type: 'integer', multipleOf: 1 }, // For conflict resolution

    createdAt: { type: 'integer', multipleOf: 1 },
  },
  required: [
    'id',
    'householdId',
    'storyId',
    'sentenceId',
    'kidId',
    'reachedAt',
    'isLocked',
    'isVerified',
    'createdAt',
  ],
  indexes: [
    'householdId',
    'kidId',
    'storyId',
    'isLocked',
    'isVerified',
    'syncedToCloud',
  ],
};

// ============================================================================
// INTERACTION LOG (Timestamped Events)
// ============================================================================

export const interactionLogSchema: RxJsonSchema<InteractionLog> = {
  title: 'Interaction Log',
  version: 0,
  type: 'object',
  primaryKey: 'id',
  properties: {
    id: { type: 'string', maxLength: 36 },
    householdId: { type: 'string', maxLength: 36 },
    eventType: {
      type: 'string',
      enum: [
        'STORY_STARTED',
        'STORY_COMPLETED',
        'GATEWAY_REACHED',
        'GATEWAY_VERIFIED',
        'QUESTION_ASKED',
        'TRANSLATION_VIEWED',
      ],
      maxLength: 20,
    },
    actorId: { type: 'string', maxLength: 36 }, // Who triggered event (kid, elder, parent)
    storyId: { type: 'string', maxLength: 36 },
    gatewayId: { type: 'string', maxLength: 36 }, // If applicable
    metadata: { type: 'object' }, // Extra context

    timestamp: {
      type: 'integer',
      multipleOf: 1,
      minimum: TIMESTAMP_MIN,
      maximum: TIMESTAMP_MAX,
    },
    syncedToCloud: { type: 'boolean' }, // Not indexed — boolean is fine here
  },
  required: ['id', 'householdId', 'eventType', 'actorId', 'timestamp'],
  indexes: ['householdId', 'eventType', 'actorId', 'timestamp'],
};

// ============================================================================
// HOUSEHOLD GOALS (Weekly Targets for Together Time)
// ============================================================================

export const householdGoalSchema: RxJsonSchema<HouseholdGoal> = {
  title: 'Household Goal',
  version: 0,
  type: 'object',
  primaryKey: 'id',
  properties: {
    id: { type: 'string', maxLength: 36 },
    householdId: { type: 'string', maxLength: 36 },
    createdBy: { type: 'string', maxLength: 36 }, // Parent ID

    // Goal metric (always collaborative, never individual)
    goalType: { type: 'string', enum: ['TOGETHER_TIME_MINUTES'], maxLength: 30 },
    targetMinutes: {
      type: 'integer',
      multipleOf: 1,
      minimum: 0,
      maximum: 1000000,
    }, // e.g., 120 minutes per week
    weekStartDate: { type: 'string', maxLength: 10 }, // YYYY-MM-DD
    weekEndDate: { type: 'string', maxLength: 10 }, // YYYY-MM-DD

    // Progress tracking (computed from interaction logs)
    isCompleted: { type: 'boolean' }, // Not indexed — boolean is fine here
    currentMinutes: {
      type: 'integer',
      multipleOf: 1,
      minimum: 0,
      maximum: 1000000,
    },

    completedAt: {
      type: 'integer',
      multipleOf: 1,
      minimum: TIMESTAMP_MIN,
      maximum: TIMESTAMP_MAX,
    },
    createdAt: {
      type: 'integer',
      multipleOf: 1,
      minimum: TIMESTAMP_MIN,
      maximum: TIMESTAMP_MAX,
    },
  },
  required: ['id', 'householdId', 'goalType', 'targetMinutes', 'weekStartDate'],
  indexes: ['householdId', 'weekStartDate'],
};

// ============================================================================
// QUESTIONS FROM KIDS (Directed to Elders)
// ============================================================================

export const kidQuestionSchema: RxJsonSchema<KidQuestion> = {
  title: 'Kid Question',
  version: 0,
  type: 'object',
  primaryKey: 'id',
  properties: {
    id: { type: 'string', maxLength: 36 },
    householdId: { type: 'string', maxLength: 36 },
    kidId: { type: 'string', maxLength: 36 },
    storyId: { type: 'string', maxLength: 36 },

    questionText: { type: 'string', maxLength: 2000 },
    questionType: { type: 'string', enum: ['GATEWAY_PROMPT', 'TRANSLATION', 'GENERAL'], maxLength: 20 },

    // Elder response
    // default: '' required because answeredBy is indexed but optional (unanswered = empty string)
    answeredBy: { type: 'string', maxLength: 36, default: '' }, // Elder ID ('' if unanswered)
    answerText: { type: 'string', maxLength: 5000 }, // Multi-line response
    answeredAt: {
      type: 'integer',
      multipleOf: 1,
      minimum: TIMESTAMP_MIN,
      maximum: TIMESTAMP_MAX,
    },
    createdAt: {
      type: 'integer',
      multipleOf: 1,
      minimum: TIMESTAMP_MIN,
      maximum: TIMESTAMP_MAX,
    },
    // SC38 fix + default: 0 required because syncedToCloud is indexed but optional
    syncedToCloud: { type: 'integer', multipleOf: 1, minimum: 0, maximum: 1, default: 0 },
  },
  required: ['id', 'householdId', 'kidId', 'questionText', 'createdAt'],
  indexes: ['householdId', 'kidId', 'answeredBy', 'syncedToCloud'],
};

// ============================================================================
// PARENT ACTIVITY VIEW (Denormalized for fast queries)
// ============================================================================

export const parentActivitySchema: RxJsonSchema<ParentActivity> = {
  title: 'Parent Activity Summary',
  version: 0,
  type: 'object',
  primaryKey: 'id',
  properties: {
    id: { type: 'string', maxLength: 36 },
    householdId: { type: 'string', maxLength: 36 },
    childId: { type: 'string', maxLength: 36 },

    // This week's activity
    storiesReadThisWeek: { type: 'integer', multipleOf: 1 },
    gatewaysCompletedThisWeek: { type: 'integer', multipleOf: 1 },
    togetherTimeMinutes: { type: 'integer', multipleOf: 1 },

    // Recent stories
    recentStories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          storyId: { type: 'string', maxLength: 36 },
          storyTitle: { type: 'string', maxLength: 500 },
          readAt: {
            type: 'integer',
            multipleOf: 1,
            minimum: TIMESTAMP_MIN,
            maximum: TIMESTAMP_MAX,
          },
        },
      },
    },

    // Unanswered questions
    unansweredQuestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          questionId: { type: 'string', maxLength: 36 },
          question: { type: 'string', maxLength: 2000 },
          askedAt: {
            type: 'integer',
            multipleOf: 1,
            minimum: TIMESTAMP_MIN,
            maximum: TIMESTAMP_MAX,
          },
        },
      },
    },

    lastUpdated: {
      type: 'integer',
      multipleOf: 1,
      minimum: TIMESTAMP_MIN,
      maximum: TIMESTAMP_MAX,
    },
    syncedToCloud: { type: 'boolean' }, // Not indexed — boolean is fine here
  },
  required: ['id', 'householdId', 'childId', 'lastUpdated'],
  indexes: ['householdId', 'childId'],
};

// ============================================================================
// REPLICATION SYNC STATE (RxDB Internal)
// ============================================================================

export const syncStateSchema: RxJsonSchema<SyncState> = {
  title: 'Sync State',
  version: 0,
  type: 'object',
  primaryKey: 'id',
  properties: {
    id: { type: 'string', maxLength: 36 },
    collectionName: { type: 'string', maxLength: 50 }, // SC17 fix: 'collection' is reserved by RxDB
    lastSyncedAt: {
      type: 'integer',
      multipleOf: 1,
      minimum: TIMESTAMP_MIN,
      maximum: TIMESTAMP_MAX,
    },
    isOnline: { type: 'boolean' }, // Not indexed — boolean is fine here
    failedAttempts: { type: 'integer', multipleOf: 1 },
    lastError: { type: 'string', maxLength: 500 },
  },
  required: ['id', 'collectionName', 'lastSyncedAt'],
  indexes: ['collectionName', 'lastSyncedAt'],
};

// ============================================================================
// AUDIO BLOBS (Local Storage for Offline)
// ============================================================================

export const audioAttachmentSchema: RxJsonSchema<AudioAttachment> = {
  title: 'Audio Attachment',
  version: 0,
  type: 'object',
  primaryKey: 'id',
  properties: {
    id: { type: 'string', maxLength: 36 },
    storyId: { type: 'string', maxLength: 36 },

    // Audio stored locally as blob reference
    audioBlob: { type: 'string', maxLength: 5000000 }, // Base64-encoded or IndexedDB reference
    mimeType: { type: 'string', maxLength: 30 }, // 'audio/wav', 'audio/mp3'
    duration: { type: 'number', multipleOf: 0.1 }, // Seconds (decimal for sub-second precision)

    // Cloud sync — SC38 fix + default: 0 required because uploadedToCloud is indexed but optional
    cloudUrl: { type: 'string', maxLength: 2000 }, // Supabase Storage URL
    uploadedAt: { type: 'integer', multipleOf: 1 },
    uploadedToCloud: { type: 'integer', multipleOf: 1, minimum: 0, maximum: 1, default: 0 },

    createdAt: { type: 'integer', multipleOf: 1 },
  },
  required: ['id', 'storyId', 'audioBlob', 'mimeType', 'duration', 'createdAt'],
  indexes: ['storyId', 'uploadedToCloud'],
};

// ============================================================================
// SCHEMA COLLECTION
// ============================================================================

export const allSchemas = {
  users: userSchema,
  themes: themeSchema,
  stories: storySchema,
  storySentences: storySentenceSchema,
  gatewayInstances: gatewayInstanceSchema,
  interactionLogs: interactionLogSchema,
  householdGoals: householdGoalSchema,
  kidQuestions: kidQuestionSchema,
  parentActivity: parentActivitySchema,
  syncStates: syncStateSchema,
  audioAttachments: audioAttachmentSchema,
};

export type FableCollections = {
  users: RxCollection<UserProfile>;
  themes: RxCollection<Theme>;
  stories: RxCollection<Story>;
  storySentences: RxCollection<StorySentence>;
  gatewayInstances: RxCollection<GatewayInstance>;
  interactionLogs: RxCollection<InteractionLog>;
  householdGoals: RxCollection<HouseholdGoal>;
  kidQuestions: RxCollection<KidQuestion>;
  parentActivity: RxCollection<ParentActivity>;
  syncStates: RxCollection<SyncState>;
  audioAttachments: RxCollection<AudioAttachment>;
};

export type FableDatabase = RxDatabase<FableCollections>;