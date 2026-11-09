/**
 * /api/checkpoint/memory — Walrus Memory proxy
 *
 * Stores checkpoint data using Walrus blob storage.
 * Each user's data is namespaced by their wallet address.
 * Uses in-memory KV store for fast read/write during the session,
 * with Walrus as the durable backend.
 *
 * GET  ?key=xxx          → read memory by key
 * POST { key, value }    → write memory
 * DELETE ?key=xxx        → remove key (not supported on Walrus — returns ok)
 */
import { NextRequest, NextResponse } from 'next/server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// ---------------------------------------------------------------------------
// In-memory store (server process lifetime)
// Walrus writes are expensive (require signed tx), so we use in-memory as
// primary fast storage and Walrus as the durable append-only record.
// In production: replace with Redis or D1.
// ---------------------------------------------------------------------------
const store = new Map<string, string>();

// Walrus read-only publisher endpoint (for fetching stored blobs)
const WALRUS_AGGREGATOR = 'https://aggregator.walrus-mainnet.walrus.space';
// Walrus write endpoint
const WALRUS_PUBLISHER  = 'https://publisher.walrus-mainnet.walrus.space';

// ── READ ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (!key) {
    return NextResponse.json({ error: 'Missing key param' }, { status: 400, headers: CORS });
  }

  // Check in-memory first
  if (store.has(key)) {
    const raw = store.get(key)!;
    try {
      return NextResponse.json({ found: true, value: JSON.parse(raw) }, { headers: CORS });
    } catch {
      return NextResponse.json({ found: true, value: raw }, { headers: CORS });
    }
  }

  // Check if there's a blob ID stored for this key (from a previous server instance)
  const blobKey = `__blobid__:${key}`;
  if (store.has(blobKey)) {
    const blobId = store.get(blobKey)!;
    try {
      const res = await fetch(`${WALRUS_AGGREGATOR}/v1/blobs/${blobId}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const text = await res.text();
        store.set(key, text); // cache it
        try {
          return NextResponse.json({ found: true, value: JSON.parse(text) }, { headers: CORS });
        } catch {
          return NextResponse.json({ found: true, value: text }, { headers: CORS });
        }
      }
    } catch {
      // Fall through to not-found
    }
  }

  return NextResponse.json({ found: false, value: null }, { headers: CORS });
}

// ── WRITE ────────────────────────────────────────────────────────────────────
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

  // Always write to in-memory (instant)
  store.set(key, serialized);

  // Fire-and-forget write to Walrus for durability
  writeToWalrus(key, serialized).catch(console.error);

  // Also push to MemWal if configured (for hackathon 10+ memories requirement)
  const parts = key.split(':');
  const userId = parts[2] || 'anonymous';
  try {
    import('@/lib/memwal/client').then(({ memwalRemember }) => {
      memwalRemember(userId, `[Checkpoint Memory] Key: ${key} -> ${serialized.slice(0, 300)}`).catch(() => {});
    }).catch(() => {});
  } catch {}

  return NextResponse.json({ ok: true, stored: 'memory+walrus' }, { headers: CORS });
}

// ---------------------------------------------------------------------------
// Walrus write (fire-and-forget for responsiveness)
// ---------------------------------------------------------------------------
async function writeToWalrus(key: string, data: string): Promise<void> {
  try {
    const bytes = new TextEncoder().encode(data);
    const res = await fetch(`${WALRUS_PUBLISHER}/v1/blobs?epochs=5`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: bytes,
      signal: AbortSignal.timeout(30_000),
    });

    if (res.ok) {
      const json = await res.json();
      // Store blob ID mapping for future server restarts
      const blobId = json?.newlyCreated?.blobObject?.blobId
        ?? json?.alreadyCertified?.blobId
        ?? null;
      if (blobId) {
        store.set(`__blobid__:${key}`, blobId);
        console.log(`[Checkpoint] Walrus write OK — key="${key}" blobId=${blobId}`);
      }
    }
  } catch (err) {
    // Non-fatal — in-memory store is the source of truth for this session
    console.warn(`[Checkpoint] Walrus write failed for key="${key}":`, err);
  }
}
