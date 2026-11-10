/**
 * /api/checkpoint/memory — Cross-Device Walrus Memory Backend
 *
 * Provides persistent read & write across devices (laptop, mobile, tablet)
 * anchored to the user's Sui wallet address via Walrus Memory (MemWal SDK).
 *
 * GET  ?key=checkpoint:index:<address>   → Loads state from memory or reconstructs from MemWal
 * POST { key, value }                    → Persists state & commits onchain to Walrus Memory
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// Global in-memory cache for fast read within active lambda
const store = new Map<string, string>();

// ── READ (Supports Cross-Device Mobile & Fresh Cold Starts) ──────────────────
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (!key) {
    return NextResponse.json({ error: 'Missing key param' }, { status: 400, headers: CORS });
  }

  // 1. Check in-memory fast cache
  if (store.has(key)) {
    const raw = store.get(key)!;
    try {
      return NextResponse.json({ found: true, value: JSON.parse(raw), source: 'cache' }, { headers: CORS });
    } catch {
      return NextResponse.json({ found: true, value: raw, source: 'cache' }, { headers: CORS });
    }
  }

  // 2. Cross-Device Walrus Memory Recovery: Query MemWal
  const parts = key.split(':');
  // key format is checkpoint:index:<address>
  const address = parts[2];

  if (address && address.startsWith('0x')) {
    try {
      const { memwalRecall } = await import('@/lib/memwal/client');
      // Recall all checkpoint and project data for this user's wallet address
      const rawMemories = await memwalRecall(address, 'CHECKPOINT_PROJECT_JSON CHECKPOINT_ENTRY_JSON', 50);

      if (rawMemories && rawMemories.length > 0) {
        const recoveredProjects: any[] = [];
        const recoveredCheckpoints: any[] = [];

        const lines = rawMemories.split('\n');
        for (const line of lines) {
          try {
            if (line.includes('[CHECKPOINT_PROJECT_JSON]:')) {
              const jsonStr = line.slice(line.indexOf('{'));
              const proj = JSON.parse(jsonStr);
              if (proj.id && !recoveredProjects.some((p) => p.id === proj.id)) {
                recoveredProjects.push(proj);
              }
            } else if (line.includes('[CHECKPOINT_ENTRY_JSON]:')) {
              const jsonStr = line.slice(line.indexOf('{'));
              const entry = JSON.parse(jsonStr);
              if (entry.id && !recoveredCheckpoints.some((c) => c.id === entry.id)) {
                recoveredCheckpoints.push(entry);
              }
            }
          } catch {
            // Ignore parse errors on individual lines
          }
        }

        if (recoveredProjects.length > 0 || recoveredCheckpoints.length > 0) {
          const recoveredIndex = {
            version: 1,
            projects: recoveredProjects,
            checkpoints: recoveredCheckpoints,
            lastUpdated: Date.now(),
          };
          store.set(key, JSON.stringify(recoveredIndex));
          console.log(`[MemWal Sync] Reconstructed ${recoveredProjects.length} projects & ${recoveredCheckpoints.length} checkpoints for ${address}`);
          return NextResponse.json(
            { found: true, value: recoveredIndex, source: 'walrus-memwal' },
            { headers: CORS }
          );
        }
      }
    } catch (err) {
      console.warn('[MemWal Sync] Cross-device recall error:', err);
    }
  }

  return NextResponse.json({ found: false, value: null }, { headers: CORS });
}

// ── WRITE (Commits On-Chain to Walrus Memory via MemWal) ─────────────────────
export async function POST(req: NextRequest) {
  let body: { key?: string; value?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS });
  }

  const { key, value } = body ?? {};
  if (!key || value === undefined) {
    return NextResponse.json({ error: 'Missing key or value' }, { status: 400, headers: CORS });
  }

  const serialized = typeof value === 'string' ? value : JSON.stringify(value);

  // 1. Immediately store in server cache
  store.set(key, serialized);

  // 2. Commit on-chain to Walrus Memory (MemWal)
  const parts = key.split(':');
  const address = parts[2];

  if (address && address.startsWith('0x')) {
    try {
      const { memwalRemember } = await import('@/lib/memwal/client');
      let parsedVal: any = null;
      try {
        parsedVal = typeof value === 'string' ? JSON.parse(value) : value;
      } catch {}

      if (parsedVal && typeof parsedVal === 'object') {
        if ('projects' in parsedVal && Array.isArray(parsedVal.projects)) {
          // Index write — save all projects
          for (const proj of parsedVal.projects) {
            const payload = `[CHECKPOINT_PROJECT_JSON]: ${JSON.stringify(proj)}`;
            await memwalRemember(address, payload);
          }
          if (Array.isArray(parsedVal.checkpoints)) {
            for (const chk of parsedVal.checkpoints) {
              const payload = `[CHECKPOINT_ENTRY_JSON]: ${JSON.stringify(chk)}`;
              await memwalRemember(address, payload);
            }
          }
        } else if ('currentWork' in parsedVal) {
          // Single checkpoint entry
          const payload = `[CHECKPOINT_ENTRY_JSON]: ${JSON.stringify(parsedVal)}`;
          await memwalRemember(address, payload);
        }
      }
    } catch (memErr) {
      console.error('[MemWal] Onchain sync write error:', memErr);
    }
  }

  return NextResponse.json({ ok: true, stored: 'memwal+walrus' }, { headers: CORS });
}
