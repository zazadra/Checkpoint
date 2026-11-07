/**
 * Tatum Sui Integration
 *
 * All browser read calls go through /api/sui-rpc (server-side proxy)
 * which injects the Tatum API key — avoiding CORS restrictions.
 *
 * Requests are kept minimal (batched) to stay within Tatum free-tier rate limits.
 */

import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const WALSIGN_PACKAGE_ID = process.env.NEXT_PUBLIC_WALSIGN_PACKAGE_ID ?? '';
const TATUM_DIRECT = 'https://sui-mainnet.gateway.tatum.io';
const TATUM_KEY    = process.env.NEXT_PUBLIC_TATUM_API_KEY ?? '';

// ---------------------------------------------------------------------------
// Raw JSON-RPC helper
// Browser  → /api/sui-rpc (proxy adds x-api-key server-side, no CORS)
// Server   → Tatum directly (no CORS issue, API key in header)
// ---------------------------------------------------------------------------

let _reqId = 0;

export async function suiRpc(method: string, params: unknown[]): Promise<any> {
  const id = ++_reqId;
  const body = JSON.stringify({ jsonrpc: '2.0', id, method, params });

  const isServer = typeof window === 'undefined';
  const url      = isServer ? TATUM_DIRECT : '/api/sui-rpc';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (isServer && TATUM_KEY) headers['x-api-key'] = TATUM_KEY;

  let attempt = 0;
  const maxAttempts = 5;
  let delay = 300;

  while (true) {
    try {
      const res = await fetch(url, { method: 'POST', headers, body });
      if (res.status === 429) {
        attempt++;
        if (attempt >= maxAttempts) {
          throw new Error(`Tatum RPC HTTP 429 (Rate Limit exceeded after ${maxAttempts} attempts)`);
        }
        console.warn(`[Tatum RPC] 429 detected, retrying attempt ${attempt}/${maxAttempts} in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      if (!res.ok) throw new Error(`Tatum RPC HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(`Tatum RPC error: ${JSON.stringify(json.error)}`);
      return json.result;
    } catch (e: any) {
      if (attempt < maxAttempts - 1) {
        attempt++;
        console.warn(`[Tatum RPC] Network/RPC error (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms...`, e);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      throw e;
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton SuiJsonRpcClient — used only for wallet tx execution
// ---------------------------------------------------------------------------

let _client: SuiJsonRpcClient | null = null;

export function getTatumSuiClient(): SuiJsonRpcClient {
  if (!_client) {
    // Wallet execution goes through public fullnode (no Tatum rate-limit on writes)
    _client = new SuiJsonRpcClient({ url: 'https://fullnode.mainnet.sui.io', network: 'mainnet' });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Batched query helpers — minimise total Tatum API calls
// ---------------------------------------------------------------------------

/**
 * Returns ALL SigningRequest objects from the WalSign package in 2 Tatum calls:
 *   1. suix_queryTransactionBlocks  → get object IDs
 *   2. sui_multiGetObjects           → get object data
 *
 * Callers then filter in JS (creator / signer) — zero extra RPC calls.
 */
export async function fetchAllSigningRequests() {
  // Call 1 — get all create_request transactions
  const txResp = await suiRpc('suix_queryTransactionBlocks', [
    {
      filter: {
        MoveFunction: {
          package: WALSIGN_PACKAGE_ID,
          module: 'walsign',
          function: 'create_request',
        },
      },
      options: { showObjectChanges: true },
    },
    null,
    100,
    true, // descending — newest first
  ]);

  const objectIds: string[] = [];
  for (const tx of txResp?.data ?? []) {
    for (const change of tx.objectChanges ?? []) {
      if (
        change.type === 'created' &&
        typeof change.objectType === 'string' &&
        change.objectType.includes('::walsign::SigningRequest')
      ) {
        objectIds.push(change.objectId);
      }
    }
  }

  if (objectIds.length === 0) return [];

  // Call 2 — fetch all objects at once
  const objects: any[] = await suiRpc('sui_multiGetObjects', [
    objectIds,
    { showContent: true },
  ]);

  return objects;
}

// ---------------------------------------------------------------------------
// Individual object helpers
// ---------------------------------------------------------------------------

export async function getSuiObject(objectId: string) {
  return await suiRpc('sui_getObject', [objectId, { showContent: true, showOwner: true }]);
}

export async function multiGetObjects(ids: string[]) {
  if (ids.length === 0) return [];
  return (await suiRpc('sui_multiGetObjects', [ids, { showContent: true }])) as any[];
}

/**
 * @deprecated Use fetchAllSigningRequests() + JS filter to save Tatum calls.
 */
export async function queryMoveFunction(params: {
  module: string;
  func: string;
  limit?: number;
  cursor?: string | null;
}) {
  return await suiRpc('suix_queryTransactionBlocks', [
    {
      filter: {
        MoveFunction: {
          package: WALSIGN_PACKAGE_ID,
          module: params.module,
          function: params.func,
        },
      },
      options: { showObjectChanges: true, showInput: true },
    },
    params.cursor ?? null,
    params.limit ?? 50,
    true,
  ]);
}
