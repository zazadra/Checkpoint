/**
 * SuiNS Integration for WalSign
 *
 * Resolves .sui names to wallet addresses and reverse-lookups addresses to names.
 * Used in signer input fields and signing certificates for human-readable identities.
 */

import { SuinsClient } from '@mysten/suins';
import { getTatumSuiClient } from '@/lib/tatum';

// ---------------------------------------------------------------------------
// SuiNS Client (singleton, reuses Tatum Sui client)
// ---------------------------------------------------------------------------

let _suinsClient: SuinsClient | null = null;

function getSuinsClient(): SuinsClient {
  if (!_suinsClient) {
    _suinsClient = new SuinsClient({
      client: getTatumSuiClient() as any,
      network: 'mainnet',
    });
  }
  return _suinsClient;
}

// ---------------------------------------------------------------------------
// Resolution cache (in-memory for session)
// ---------------------------------------------------------------------------

const nameToAddrCache = new Map<string, string | null>();
const addrToNameCache = new Map<string, string | null>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve a .sui name to a wallet address.
 * Returns null if name not found or expired.
 *
 * @example
 * resolveNameToAddress('alice.sui') → '0x1a2b...'
 */
export async function resolveNameToAddress(name: string): Promise<string | null> {
  const normalized = name.toLowerCase().trim();
  if (!normalized.endsWith('.sui')) return null;

  if (nameToAddrCache.has(normalized)) {
    return nameToAddrCache.get(normalized) ?? null;
  }

  try {
    const record = await getSuinsClient().getNameRecord(normalized);
    const addr = record?.targetAddress ?? null;
    nameToAddrCache.set(normalized, addr);
    return addr;
  } catch {
    nameToAddrCache.set(normalized, null);
    return null;
  }
}

/**
 * Reverse-lookup: get the primary .sui name for a wallet address.
 * Returns null if the address has no associated name.
 *
 * @example
 * resolveAddressToName('0x1a2b...') → 'alice.sui'
 */
export async function resolveAddressToName(address: string): Promise<string | null> {
  if (!address) return null;

  if (addrToNameCache.has(address)) {
    return addrToNameCache.get(address) ?? null;
  }

  try {
    const suiClient = getTatumSuiClient();
    const result = await suiClient.resolveNameServiceNames({ address });
    const name = result.data?.[0] ?? null;
    addrToNameCache.set(address, name);
    return name;
  } catch {
    addrToNameCache.set(address, null);
    return null;
  }
}

/**
 * Resolve multiple addresses to names in parallel.
 * Returns a Map of address → name (null if no name).
 */
export async function resolveAddressesToNames(
  addresses: string[],
): Promise<Map<string, string | null>> {
  const results = await Promise.all(
    addresses.map(async (addr) => ({
      addr,
      name: await resolveAddressToName(addr),
    })),
  );
  return new Map(results.map((r) => [r.addr, r.name]));
}

/**
 * Parse signer input: accepts both 0x addresses and .sui names.
 * Returns { address, name } — name is null for raw hex inputs.
 */
export async function parseSignerInput(input: string): Promise<{
  address: string | null;
  name: string | null;
  error: string | null;
}> {
  const trimmed = input.trim();

  // Raw hex address
  if (trimmed.startsWith('0x')) {
    if (trimmed.length < 10) {
      return { address: null, name: null, error: 'Invalid Sui address' };
    }
    const name = await resolveAddressToName(trimmed);
    return { address: trimmed, name, error: null };
  }

  // SuiNS name
  if (trimmed.endsWith('.sui')) {
    const address = await resolveNameToAddress(trimmed);
    if (!address) {
      return { address: null, name: trimmed, error: `"${trimmed}" not found or expired` };
    }
    return { address, name: trimmed, error: null };
  }

  return { address: null, name: null, error: 'Enter a .sui name or 0x... address' };
}

/**
 * Format an address for display: show .sui name if available, else truncate hex.
 * e.g. 'alice.sui' or '0x1a2b...f8e9'
 */
export function formatIdentity(address: string, name: string | null | undefined): string {
  if (name) return name;
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
