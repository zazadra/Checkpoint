/**
 * MemWal client — official @mysten-incubation/memwal SDK
 * Checkpoint Integration for Walrus Memory on Sui
 *
 * Provides cross-device persistent memory on Walrus Mainnet.
 */

import { MemWal } from '@mysten-incubation/memwal';
import fs from 'fs';
import path from 'path';
import os from 'os';

const DEFAULT_ACCOUNT_ID = '0x6c36e6efa48b212aeab2a3622d673bb3edeed7ab8f02ef9ca93f521d36c1f6ea';
const DEFAULT_PRIVATE_KEY = '8e85f16aa5ca64f095af05ab382b25132f63e11762406d71b0f04a4ceee229cf';
const DEFAULT_RELAYER_URL = 'https://relayer.memory.walrus.xyz';

let _client: MemWal | null = null;

export function getClient(): MemWal {
  if (_client) return _client;

  let key = process.env.MEMWAL_PRIVATE_KEY ?? '';
  let accountId = process.env.MEMWAL_ACCOUNT_ID ?? '';
  let serverUrl = process.env.MEMWAL_SERVER_URL ?? DEFAULT_RELAYER_URL;

  // Fallback 1: check local ~/.memwal/credentials.json
  if (!key || !accountId) {
    try {
      const credPath = path.join(os.homedir(), '.memwal', 'credentials.json');
      if (fs.existsSync(credPath)) {
        const c = JSON.parse(fs.readFileSync(credPath, 'utf8'));
        key = key || c.delegatePrivateKey || '';
        accountId = accountId || c.accountId || '';
        serverUrl = serverUrl || c.relayerUrl || DEFAULT_RELAYER_URL;
      }
    } catch {
      // Ignore filesystem read errors in restricted serverless environments
    }
  }

  // Fallback 2: default project delegate credentials (ensures Vercel & mobile sync immediately)
  key = key || DEFAULT_PRIVATE_KEY;
  accountId = accountId || DEFAULT_ACCOUNT_ID;

  _client = MemWal.create({ key, accountId, serverUrl });
  return _client;
}

/** Recall memories for a user namespace (Sui wallet address). */
export async function memwalRecall(
  userId: string,
  query: string,
  limit = 20,
): Promise<string> {
  try {
    const memwal = getClient();
    const result = await memwal.recall({ query, namespace: userId, limit });
    if (!result?.results?.length) return '';
    return result.results.map((r: { text: string }) => r.text).join('\n');
  } catch (err) {
    console.error('[MemWal] recall error:', err);
    return '';
  }
}

/** Save a new memory for a user namespace on Walrus Memory. */
export async function memwalRemember(userId: string, text: string): Promise<string | null> {
  try {
    const memwal = getClient();
    const job = await memwal.remember(text, userId);
    if (job?.job_id) {
      console.log(`[MemWal] Remember job queued: ${job.job_id} for ${userId}`);
      return job.job_id;
    }
    return null;
  } catch (err) {
    console.error('[MemWal] remember error:', err);
    return null;
  }
}
