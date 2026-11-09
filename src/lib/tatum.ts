/**
 * Tatum Sui Integration for Checkpoint
 *
 * Checkpoint integrates with Tatum's Sui Mainnet Gateway at:
 * https://sui-mainnet.gateway.tatum.io/graphql
 *
 * All browser calls go through /api/sui-rpc (server-side proxy)
 * which injects the Tatum API key and avoids CORS.
 */

const TATUM_GRAPHQL_DIRECT = 'https://sui-mainnet.gateway.tatum.io/graphql';
const TATUM_KEY = process.env.NEXT_PUBLIC_TATUM_API_KEY ?? '';

// ---------------------------------------------------------------------------
// Tatum Sui GraphQL Helper
// ---------------------------------------------------------------------------

export async function tatumSuiGraphQL<T = any>(
  query: string,
  variables: Record<string, any> = {}
): Promise<T> {
  const isServer = typeof window === 'undefined';
  const url = isServer ? TATUM_GRAPHQL_DIRECT : '/api/sui-rpc';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (isServer && TATUM_KEY) {
    headers['x-api-key'] = TATUM_KEY;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Tatum GraphQL HTTP ${res.status}`);
  }

  const json = await res.json();
  if (json.errors && json.errors.length > 0) {
    throw new Error(`Tatum GraphQL error: ${json.errors[0].message}`);
  }

  return json.data as T;
}

// ---------------------------------------------------------------------------
// Balance Fetcher via Tatum GraphQL
// ---------------------------------------------------------------------------

export async function getSuiBalanceViaTatum(address: string): Promise<string> {
  const query = `
    query getBalance($owner: SuiAddress!) {
      address(address: $owner) {
        balance(coinType: "0x2::sui::SUI") {
          totalBalance
        }
      }
    }
  `;

  try {
    const data = await tatumSuiGraphQL<{
      address?: { balance?: { totalBalance?: string } };
    }>(query, { owner: address });

    const rawMist = data.address?.balance?.totalBalance ?? '0';
    const mist = BigInt(rawMist);
    return (Number(mist) / 1_000_000_000).toFixed(3);
  } catch (err) {
    console.warn('[Tatum] getSuiBalanceViaTatum error, falling back:', err);
    // Fallback via suiRpc
    try {
      const res = await suiRpc('suix_getBalance', [address, '0x2::sui::SUI']);
      const mist = BigInt(res?.totalBalance ?? '0');
      return (Number(mist) / 1_000_000_000).toFixed(3);
    } catch {
      return '0.000';
    }
  }
}

// ---------------------------------------------------------------------------
// Raw JSON-RPC helper (proxies via /api/sui-rpc)
// ---------------------------------------------------------------------------

let _reqId = 0;

export async function suiRpc(method: string, params: unknown[]): Promise<any> {
  const id = ++_reqId;
  const body = JSON.stringify({ jsonrpc: '2.0', id, method, params });

  const url = typeof window === 'undefined' ? 'https://fullnode.mainnet.sui.io:443' : '/api/sui-rpc';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  let attempt = 0;
  const maxAttempts = 3;
  let delay = 300;

  while (true) {
    try {
      const res = await fetch(url, { method: 'POST', headers, body });
      if (res.status === 429) {
        attempt++;
        if (attempt >= maxAttempts) {
          throw new Error(`Tatum RPC HTTP 429 (Rate Limit exceeded)`);
        }
        await new Promise((r) => setTimeout(r, delay));
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
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      throw e;
    }
  }
}
