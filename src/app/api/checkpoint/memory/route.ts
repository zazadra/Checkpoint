/**
 * /api/checkpoint/memory — Server-side proxy for Walrus Memory
 *
 * Proxies browser requests to the Walrus Memory relayer so:
 *   1. No CORS issues (server → relayer)
 *   2. Agent signing key never exposed to browser
 *
 * GET  ?key=xxx          → read memory by key
 * POST { key, value }    → write memory
 */
import { NextRequest, NextResponse } from 'next/server';

const RELAYER = 'https://relayer.memory.walrus.xyz';

// The agent ID comes from `memwal-mcp login` — same account the MCP uses.
// This is a PUBLIC delegate key, safe to expose here.
const AGENT_ID =
  process.env.MEMWAL_AGENT_ID ??
  '0x6c36e6efa48b212aeab2a3622d673bb3edeed7ab8f02ef9ca93f521d36c1f6ea';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// ── READ ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (!key) {
    return NextResponse.json({ error: 'Missing key param' }, { status: 400, headers: CORS });
  }

  try {
    // Try the Walrus Memory REST API: GET /v1/memory/{agentId}/{key}
    const url = `${RELAYER}/v1/memory/${encodeURIComponent(AGENT_ID)}/${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 404) {
      return NextResponse.json({ found: false, value: null }, { headers: CORS });
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Relayer error ${res.status}: ${text}` },
        { status: res.status, headers: CORS }
      );
    }

    const json = await res.json();
    return NextResponse.json({ found: true, ...json }, { headers: CORS });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Read failed' },
      { status: 500, headers: CORS }
    );
  }
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

  try {
    const res = await fetch(`${RELAYER}/v1/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: AGENT_ID,
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Relayer write error ${res.status}: ${text}` },
        { status: res.status, headers: CORS }
      );
    }

    const json = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: true, ...json }, { headers: CORS });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Write failed' },
      { status: 500, headers: CORS }
    );
  }
}
