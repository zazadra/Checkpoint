/**
 * Checkpoint — Type Definitions
 *
 * A "checkpoint" is a work session snapshot: what you're building,
 * where you're stuck, and what decisions you've made.
 * These are stored as Walrus Memory blobs, keyed per wallet address.
 */

// ---------------------------------------------------------------------------
// Core domain types
// ---------------------------------------------------------------------------

export interface Project {
  id: string;             // uuid
  name: string;
  description: string;
  color: ProjectColor;
  createdAt: number;      // unix ms
  updatedAt: number;
}

export type ProjectColor =
  | 'violet'
  | 'cyan'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'indigo';

export interface CheckpointEntry {
  id: string;             // uuid
  projectId: string;
  walrusOwner: string;    // Sui address of the creator

  // What the user filled in
  currentWork: string;    // "What are you working on?"
  blockers: string;       // "Where are you stuck?" (optional)
  decisions: string;      // "What decisions did you make?" (optional)
  nextSteps: string;      // "What's your next move?" (optional)
  mood: SessionMood;

  createdAt: number;      // unix ms
  sessionDuration?: number; // minutes spent in the session

  // Walrus storage references
  blobId?: string;        // set after write to Walrus Mainnet
  walrusTxDigest?: string;
}

export type SessionMood = 'great' | 'good' | 'meh' | 'stuck' | 'blocked';

// ---------------------------------------------------------------------------
// Insight types — derived from checkpoint history
// ---------------------------------------------------------------------------

export interface ProjectInsight {
  projectId: string;
  totalCheckpoints: number;
  mostRecentAt: number;

  /** Topics/keywords that keep appearing across sessions */
  recurringThemes: string[];

  /** How many times the user was stuck on the same thing */
  blockerFrequency: Record<string, number>;

  /** Dominant mood across last 5 sessions */
  recentMoodTrend: SessionMood;

  /** Days since last checkpoint */
  daysSinceLastCheckpoint: number;
}

// ---------------------------------------------------------------------------
// Storage schema — what gets written to Walrus Memory
// ---------------------------------------------------------------------------

/** Root index stored under `checkpoint:index:{walletAddress}` */
export interface CheckpointIndex {
  version: 1;
  projects: Project[];
  checkpoints: CheckpointEntry[];
  lastUpdated: number;
}

// ---------------------------------------------------------------------------
// Walrus Memory key helpers
// ---------------------------------------------------------------------------

export const MEMORY_KEYS = {
  index: (address: string) => `checkpoint:index:${address}`,
  project: (address: string, projectId: string) =>
    `checkpoint:project:${address}:${projectId}`,
} as const;
