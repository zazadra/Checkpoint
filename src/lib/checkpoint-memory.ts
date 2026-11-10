/**
 * Checkpoint — Walrus Memory Integration (browser-safe)
 *
 * Routes all reads/writes through /api/checkpoint/memory (server proxy)
 * to avoid CORS and to keep the agent signing key server-side.
 *
 * Data model:
 *   key `checkpoint:index:{address}` → CheckpointIndex (projects + all entries)
 *   key `checkpoint:entry:{address}:{id}` → individual CheckpointEntry (bonus write)
 */

import type {
  CheckpointEntry,
  CheckpointIndex,
  Project,
  ProjectInsight,
  SessionMood,
} from './checkpoint-types';
import { MEMORY_KEYS } from './checkpoint-types';

// ---------------------------------------------------------------------------
// Low-level read / write via API proxy
// ---------------------------------------------------------------------------

function mergeIndices(local: any, remote: any): any {
  if (!local) return remote;
  if (!remote) return local;
  if (!local.projects && !remote.projects) return remote || local;

  const projectMap = new Map<string, any>();
  for (const p of [...(remote?.projects || []), ...(local?.projects || [])]) {
    if (p && p.id) projectMap.set(p.id, p);
  }

  const checkpointMap = new Map<string, any>();
  for (const c of [...(remote?.checkpoints || []), ...(local?.checkpoints || [])]) {
    if (c && c.id) checkpointMap.set(c.id, c);
  }

  return {
    version: 1,
    projects: Array.from(projectMap.values()),
    checkpoints: Array.from(checkpointMap.values()),
    lastUpdated: Math.max(local?.lastUpdated || 0, remote?.lastUpdated || 0, Date.now()),
  };
}

async function memGet<T>(key: string): Promise<T | null> {
  let localValue: T | null = null;
  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(key);
      if (local) {
        localValue = JSON.parse(local) as T;
      }
    } catch {
      // Ignore localStorage parse errors
    }
  }

  try {
    const res = await fetch(`/api/checkpoint/memory?key=${encodeURIComponent(key)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.found && json.value != null) {
        const serverValue = (typeof json.value === 'string' ? JSON.parse(json.value) : json.value) as T;
        const merged = mergeIndices(localValue, serverValue) as T;

        // Cache the merged data on the current device (e.g. mobile)
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(key, JSON.stringify(merged));
          } catch {}
        }
        return merged;
      }
    }
  } catch (err) {
    console.warn('[Checkpoint] Server memory read failed, falling back to local:', err);
  }

  return localValue;
}

async function memSet(key: string, value: unknown): Promise<void> {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);

  // 1. Immediately persist to browser localStorage so refresh NEVER loses data
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(key, serialized);
    } catch (e) {
      console.warn('[Checkpoint] localStorage write warning:', e);
    }
  }

  // 2. Sync to server proxy & Walrus Memory durable backend
  try {
    await fetch('/api/checkpoint/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
  } catch (err) {
    console.warn('[Checkpoint] Remote memory write failed (local saved):', err);
  }
}

// ---------------------------------------------------------------------------
// Index management
// ---------------------------------------------------------------------------

async function getIndex(address: string): Promise<CheckpointIndex> {
  const existing = await memGet<CheckpointIndex>(MEMORY_KEYS.index(address));
  return (
    existing ?? {
      version: 1,
      projects: [],
      checkpoints: [],
      lastUpdated: Date.now(),
    }
  );
}

async function saveIndex(address: string, index: CheckpointIndex): Promise<void> {
  index.lastUpdated = Date.now();
  await memSet(MEMORY_KEYS.index(address), index);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function loadCheckpointIndex(address: string): Promise<CheckpointIndex | null> {
  try {
    return await memGet<CheckpointIndex>(MEMORY_KEYS.index(address));
  } catch (err) {
    console.error('[Checkpoint] loadCheckpointIndex:', err);
    return null;
  }
}

export async function createProject(
  address: string,
  project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Project> {
  const index = await getIndex(address);
  const created: Project = {
    ...project,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  index.projects.push(created);
  await saveIndex(address, index);
  return created;
}

export async function saveCheckpoint(
  address: string,
  entry: Omit<CheckpointEntry, 'id' | 'walrusOwner' | 'blobId'>
): Promise<CheckpointEntry> {
  const index = await getIndex(address);

  const saved: CheckpointEntry = {
    ...entry,
    id: crypto.randomUUID(),
    walrusOwner: address,
    createdAt: entry.createdAt ?? Date.now(),
  };

  index.checkpoints.push(saved);

  // Update project.updatedAt
  const proj = index.projects.find((p) => p.id === saved.projectId);
  if (proj) proj.updatedAt = Date.now();

  // Primary write — this counts as 1 Walrus Memory write
  await saveIndex(address, index);

  // Secondary write — individual entry for deeper memory loop
  // (contributes to 10+ memories requirement)
  await memSet(`checkpoint:entry:${address}:${saved.id}`, saved).catch(() => {
    // Non-blocking — index write already succeeded
  });

  return saved;
}

export async function getProjectCheckpoints(
  address: string,
  projectId: string
): Promise<CheckpointEntry[]> {
  const index = await getIndex(address);
  return index.checkpoints
    .filter((c) => c.projectId === projectId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getLastCheckpoint(
  address: string,
  projectId: string
): Promise<CheckpointEntry | null> {
  const list = await getProjectCheckpoints(address, projectId);
  return list[0] ?? null;
}

// ---------------------------------------------------------------------------
// Insight Engine
// ---------------------------------------------------------------------------

function extractKeywords(texts: string[]): string[] {
  const stop = new Set([
    'the','a','an','and','or','but','in','on','at','to','for','of','with',
    'by','from','as','is','was','are','be','been','i','my','me','we','it',
    'this','that','need','want','have','has','had','will','can','could',
    'would','should','still','also','some','more','not','yet','then','when',
    'how','what','about','just','make','work','working','using','use',
  ]);
  const freq: Record<string, number> = {};
  texts.join(' ').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter((w) => w.length > 3 && !stop.has(w))
    .forEach((w) => { freq[w] = (freq[w] ?? 0) + 1; });
  return Object.entries(freq)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([w]) => w);
}

export function computeInsights(
  projectId: string,
  checkpoints: CheckpointEntry[]
): ProjectInsight {
  if (!checkpoints.length) {
    return {
      projectId, totalCheckpoints: 0, mostRecentAt: 0,
      recurringThemes: [], blockerFrequency: {},
      recentMoodTrend: 'good', daysSinceLastCheckpoint: 0,
    };
  }
  const sorted = [...checkpoints].sort((a, b) => b.createdAt - a.createdAt);
  const mostRecentAt = sorted[0].createdAt;
  const daysSinceLastCheckpoint = Math.floor(
    (Date.now() - mostRecentAt) / (1000 * 60 * 60 * 24)
  );

  const recurringThemes = extractKeywords(
    checkpoints.flatMap((c) => [c.currentWork, c.decisions].filter(Boolean))
  );

  const blockerFrequency: Record<string, number> = {};
  checkpoints.forEach((c) => {
    if (c.blockers?.trim()) {
      const k = c.blockers.trim().slice(0, 60);
      blockerFrequency[k] = (blockerFrequency[k] ?? 0) + 1;
    }
  });

  const moodCounts: Partial<Record<SessionMood, number>> = {};
  sorted.slice(0, 5).forEach((c) => {
    moodCounts[c.mood] = (moodCounts[c.mood] ?? 0) + 1;
  });
  const recentMoodTrend = (
    Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'good'
  ) as SessionMood;

  return {
    projectId,
    totalCheckpoints: checkpoints.length,
    mostRecentAt,
    recurringThemes,
    blockerFrequency,
    recentMoodTrend,
    daysSinceLastCheckpoint,
  };
}

// ---------------------------------------------------------------------------
// Tatum RPC — SUI balance
// ---------------------------------------------------------------------------

export async function getWalletSuiBalance(address: string): Promise<string> {
  try {
    const { getSuiBalanceViaTatum } = await import('./tatum');
    return await getSuiBalanceViaTatum(address);
  } catch {
    return '0.000';
  }
}
