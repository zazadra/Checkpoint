/**
 * /api/sui-rpc — Server-side proxy for Tatum Sui Gateway (Mainnet)
 *
 * Tatum provides a Sui GraphQL gateway at:
 * https://sui-mainnet.gateway.tatum.io/graphql
 *
 * This proxy handles:
 * 1. Native GraphQL queries (routed directly to Tatum with x-api-key)
 * 2. Standard JSON-RPC suix_getBalance (translated to Tatum GraphQL so Tatum RPC counts)
 * 3. General JSON-RPC fallback to public mainnet fullnode
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const TATUM_GRAPHQL_URL = 'https://sui-mainnet.gateway.tatum.io/graphql';
const TATUM_API_KEY = process.env.NEXT_PUBLIC_TATUM_API_KEY ?? '';
const SUI_PUBLIC_RPC = 'https://fullnode.mainnet.sui.io:443';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      // Pass-through as raw if not JSON
    }

    // ── 1. Native GraphQL Query to Tatum ────────────────────────────
    if (parsed && typeof parsed.query === 'string') {
      const response = await fetch(TATUM_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(TATUM_API_KEY ? { 'x-api-key': TATUM_API_KEY } : {}),
        },
        body: rawBody,
      });

      const data = await response.text();
      return new NextResponse(data, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // ── 2. JSON-RPC suix_getBalance -> translated to Tatum GraphQL ──
    if (parsed && parsed.method === 'suix_getBalance') {
      const owner = parsed.params?.[0];
      const coinType = parsed.params?.[1] || '0x2::sui::SUI';

      if (owner && typeof owner === 'string') {
        const gqlQuery = `
          query getBalance($owner: SuiAddress!, $coinType: String!) {
            address(address: $owner) {
              balance(coinType: $coinType) {
                totalBalance
                coinType {
                  repr
                }
              }
            }
          }
        `;

        try {
          const gqlRes = await fetch(TATUM_GRAPHQL_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              ...(TATUM_API_KEY ? { 'x-api-key': TATUM_API_KEY } : {}),
            },
            body: JSON.stringify({
              query: gqlQuery,
              variables: { owner, coinType },
            }),
          });

          if (gqlRes.ok) {
            const gqlData = await gqlRes.json();
            const totalBalance = gqlData.data?.address?.balance?.totalBalance ?? '0';
            return NextResponse.json({
              jsonrpc: '2.0',
              id: parsed.id ?? 1,
              result: {
                coinType,
                coinObjectCount: 1,
                totalBalance,
                lockedBalance: {},
              },
            });
          }
        } catch (gqlErr) {
          console.warn('[sui-rpc] Tatum GraphQL balance translation error, falling back to fullnode:', gqlErr);
        }
      }
    }

    // ── 3. Fallback for other standard JSON-RPC calls ────────────────
    const response = await fetch(SUI_PUBLIC_RPC, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: rawBody,
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
    console.error('[sui-rpc proxy error]', err);
    return NextResponse.json({ error: err?.message ?? 'Proxy error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    },
  });
}
