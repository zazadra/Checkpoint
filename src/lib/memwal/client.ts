/**
 * MemWal client — official @mysten-incubation/memwal SDK
 * Checkpoint Integration for Walrus Memory
 *
 * Env vars (set in Vercel & .env.local):
 *   MEMWAL_PRIVATE_KEY  — delegate private key (from memwal-mcp login)
 *   MEMWAL_ACCOUNT_ID   — account object ID (0x...)
 *   MEMWAL_SERVER_URL   — https://relayer.memory.walrus.xyz
 */

import { MemWal } from '@mysten-incubation/memwal';
import fs from 'fs';
import path from 'path';
import os from 'os';

let _client: MemWal | null = null;

export function isMemWalConfigured(): boolean {
  try {
    getClient();
    return true;
  } catch {
    return false;
  }
}

export function getClient(): MemWal {
  if (_client) return _client;

  let key       = process.env.MEMWAL_PRIVATE_KEY ?? '';
  let accountId = process.env.MEMWAL_ACCOUNT_ID  ?? '';
  let serverUrl = process.env.MEMWAL_SERVER_URL  ?? 'https://relayer.memory.walrus.xyz';

  // Fallback to local ~/.memwal/credentials.json if env vars are missing
  if (!key || !accountId) {
    try {
      const credPath = path.join(os.homedir(), '.memwal', 'credentials.json');
      if (fs.existsSync(credPath)) {
        const c = JSON.parse(fs.readFileSync(credPath, 'utf8'));
        key = key || c.delegatePrivateKey || '';
        accountId = accountId || c.accountId || '';
        serverUrl = serverUrl || c.relayerUrl || 'https://relayer.memory.walrus.xyz';
      }
    } catch {
      // Ignore filesystem read errors in restricted environments
    }
  }

  if (!key || !accountId) {
    throw new Error('MemWal: MEMWAL_PRIVATE_KEY and MEMWAL_ACCOUNT_ID must be set.');
  }

  _client = MemWal.create({ key, accountId, serverUrl });
  return _client;
}

/** Recall relevant memories for a user namespace (Sui wallet address). */
export async function memwalRecall(
  userId: string,
  query: string,
  limit = 5,
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

/** Save a new memory for a user namespace (fire-and-forget safe). */
export async function memwalRemember(userId: string, text: string): Promise<string | null> {
  try {
    const memwal = getClient();
    const job = await memwal.remember(text, userId);
    if (job?.job_id) {
      console.log(`[MemWal] Remember job queued: ${job.job_id} for ${userId}`);
      memwal.waitForRememberJob(job.job_id).then((res: any) => {
        console.log(`[MemWal] Remember completed! Blob ID:`, res?.blob_id || res?.blobId);
      }).catch((e: unknown) =>
        console.error('[MemWal] waitForRememberJob error:', e),
      );
      return job.job_id;
    }
    return null;
  } catch (err) {
    console.error('[MemWal] remember error:', err);
    return null;
  }
}
