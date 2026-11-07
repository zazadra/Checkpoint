import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { verifyPersonalMessageSignature } from '@mysten/sui/verify';

const KEYS_FILE_PATH = path.join(process.cwd(), 'scratch/walsign-vault-keys.json');

interface KeyRecord {
  blobId: string;
  metaBlobId: string;
  keyHex: string;
  createdAt: number;
}

function readKeysFile(): Record<string, KeyRecord> {
  try {
    if (!fs.existsSync(KEYS_FILE_PATH)) {
      // Ensure the directory exists
      const dir = path.dirname(KEYS_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(KEYS_FILE_PATH, JSON.stringify({}));
      return {};
    }
    const data = fs.readFileSync(KEYS_FILE_PATH, 'utf-8');
    return JSON.parse(data || '{}');
  } catch (err) {
    console.error('[Vault Keys API] Failed to read keys file:', err);
    return {};
  }
}

function writeKeysFile(data: Record<string, KeyRecord>) {
  try {
    const dir = path.dirname(KEYS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(KEYS_FILE_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[Vault Keys API] Failed to write keys file:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, blobId, metaBlobId, keyHex, signature, address } = body;

    if (action === 'register') {
      if (!blobId || !metaBlobId || !keyHex) {
        return NextResponse.json({ error: 'Missing required parameters for registration' }, { status: 400 });
      }

      const keys = readKeysFile();
      keys[blobId] = {
        blobId,
        metaBlobId,
        keyHex,
        createdAt: Date.now(),
      };
      writeKeysFile(keys);

      return NextResponse.json({ success: true });
    }

    if (action === 'retrieve') {
      if (!blobId || !signature || !address) {
        return NextResponse.json({ error: 'Missing required parameters for retrieval' }, { status: 400 });
      }

      // 1. Verify Wallet Signature
      const messageText = `WalSign: Request decryption key for ${blobId}`;
      const messageBytes = new TextEncoder().encode(messageText);

      try {
        await verifyPersonalMessageSignature(messageBytes, signature, { address });
      } catch (err: any) {
        console.error('[Vault Keys API] Signature verification failed:', err);
        return NextResponse.json({ error: 'Invalid signature or address mismatch' }, { status: 400 });
      }

      // 2. Lookup the registered key record
      const keys = readKeysFile();
      const record = keys[blobId];
      if (!record) {
        return NextResponse.json({ error: 'Decryption key not found for this blob ID' }, { status: 404 });
      }

      // 3. Fetch ProofCapsule metadata from Walrus using metaBlobId
      try {
        const walrusUrl = `https://aggregator.walrus-mainnet.walrus.space/v1/blobs/${record.metaBlobId}`;
        const response = await fetch(walrusUrl, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) {
          return NextResponse.json({ error: 'Failed to fetch capsule metadata from Walrus' }, { status: 502 });
        }
        
        const capsule = await response.json();
        
        // 4. Validate creator or allowedViewers
        const isCreator = capsule.creator?.toLowerCase() === address.toLowerCase();
        const allowed = Array.isArray(capsule.allowedViewers) ? capsule.allowedViewers : [];
        const isAllowed = allowed.some((addr: string) => addr.toLowerCase() === address.toLowerCase());

        if (!isCreator && !isAllowed) {
          return NextResponse.json({ error: 'You are not authorized to decrypt this document' }, { status: 403 });
        }

        return NextResponse.json({ keyHex: record.keyHex });
      } catch (err: any) {
        console.error('[Vault Keys API] Walrus fetch or auth error:', err);
        return NextResponse.json({ error: 'Authentication or metadata retrieval failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('[Vault Keys API] Request error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
