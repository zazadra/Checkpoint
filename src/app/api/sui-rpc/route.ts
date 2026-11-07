/**
 * /api/sui-rpc — Server-side proxy for Tatum Sui RPC
 *
 * Tatum requires an API key header which browsers block due to CORS.
 * This route proxies all JSON-RPC calls server-side so the header is safe.
 */

import { NextRequest, NextResponse } from 'next/server';

const TATUM_SUI_RPC = 'https://sui-mainnet.gateway.tatum.io';
const TATUM_API_KEY = process.env.NEXT_PUBLIC_TATUM_API_KEY ?? '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    const response = await fetch(TATUM_SUI_RPC, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': TATUM_API_KEY,
      },
      body,
    });

    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Proxy error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
