/**
 * WalSign — Core Sui Integration
 *
 * Transaction builders and data fetchers for the WalSign Move contract.
 * All RPC calls go through Tatum (see tatum.ts).
 */

import { Transaction } from '@mysten/sui/transactions';
import {
  WALSIGN_PACKAGE_ID,
  getTatumSuiClient,
  queryMoveFunction,
  getSuiObject,
  multiGetObjects,
  fetchAllSigningRequests,
} from '@/lib/tatum';
import type { SigningRequest } from '@/types/walsign';

// ---------------------------------------------------------------------------
// Transaction builders
// ---------------------------------------------------------------------------

/**
 * Build a Transaction to create a new signing request on-chain.
 * The SigningRequest object will be shared so all signers can interact directly.
 */
export async function buildCreateRequestTx(params: {
  title: string;
  blobId: string;
  documentHash: string;
  signers: string[];
  message: string;
  clockObjectId?: string;
}): Promise<Transaction> {
  const txb = new Transaction();
  const clock = params.clockObjectId ?? '0x6'; // Sui system clock object

  txb.moveCall({
    target: `${WALSIGN_PACKAGE_ID}::walsign::create_request`,
    arguments: [
      txb.pure.string(params.title),
      txb.pure.string(params.blobId),
      txb.pure.string(params.documentHash),
      txb.makeMoveVec({
        type: 'address',
        elements: params.signers.map(addr => txb.pure.address(addr)),
      }),
      txb.pure.string(params.message),
      txb.object(clock),
    ],
  });

  return txb;
}

/**
 * Build a Transaction for a signer to sign a document.
 */
export async function buildSignDocumentTx(params: {
  requestObjectId: string;
  clockObjectId?: string;
}): Promise<Transaction> {
  const txb = new Transaction();
  const clock = params.clockObjectId ?? '0x6';

  txb.moveCall({
    target: `${WALSIGN_PACKAGE_ID}::walsign::sign`,
    arguments: [txb.object(params.requestObjectId), txb.object(clock)],
  });

  return txb;
}

/**
 * Build a Transaction for the creator to revoke a signing request.
 */
export async function buildRevokeTx(params: {
  requestObjectId: string;
  clockObjectId?: string;
}): Promise<Transaction> {
  const txb = new Transaction();
  const clock = params.clockObjectId ?? '0x6';

  txb.moveCall({
    target: `${WALSIGN_PACKAGE_ID}::walsign::revoke`,
    arguments: [txb.object(params.requestObjectId), txb.object(clock)],
  });

  return txb;
}

// ---------------------------------------------------------------------------
// Data fetchers
// ---------------------------------------------------------------------------

/**
 * Fetch a single SigningRequest object by its Sui object ID.
 */
export async function getSigningRequest(objectId: string): Promise<SigningRequest | null> {
  try {
    const result = await getSuiObject(objectId);
    return parseSuiSigningRequest(result);
  } catch (e) {
    console.error('[WalSign] getSigningRequest failed:', e);
    return null;
  }
}

export async function getRequestByBlobId(blobId: string): Promise<SigningRequest | null> {
  try {
    const objects = await fetchAllSigningRequests();
    for (const obj of objects) {
      const parsed = parseSuiSigningRequest(obj);
      if (parsed?.blobId === blobId) return parsed;
    }
    return null;
  } catch (e) {
    console.error('[WalSign] getRequestByBlobId failed:', e);
    return null;
  }
}

/**
 * Get all signing requests created by a wallet address.
 * Uses fetchAllSigningRequests() — only 2 Tatum calls total.
 */
export async function getRequestsByCreator(creatorAddress: string): Promise<SigningRequest[]> {
  try {
    const objects = await fetchAllSigningRequests();
    return objects
      .map(parseSuiSigningRequest)
      .filter((r): r is SigningRequest => r !== null && r.creator === creatorAddress);
  } catch (e) {
    console.error('[WalSign] getRequestsByCreator failed:', e);
    return [];
  }
}

/**
 * Get all signing requests where a wallet is a required signer.
 * Reuses the same fetchAllSigningRequests() batch — 0 extra Tatum calls.
 */
export async function getRequestsForSigner(signerAddress: string): Promise<SigningRequest[]> {
  try {
    const objects = await fetchAllSigningRequests();
    return objects
      .map(parseSuiSigningRequest)
      .filter(
        (r): r is SigningRequest =>
          r !== null &&
          r.requiredSigners.includes(signerAddress) &&
          r.creator !== signerAddress,
      );
  } catch (e) {
    console.error('[WalSign] getRequestsForSigner failed:', e);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

export function parseSuiSigningRequest(obj: any): SigningRequest | null {
  try {
    if (obj?.data?.content?.dataType !== 'moveObject') return null;
    const fields = obj.data.content.fields as Record<string, any>;

    return {
      objectId: obj.data.objectId,
      title: fields.title ?? '',
      blobId: fields.blob_id ?? '',
      documentHash: fields.document_hash ?? '',
      creator: fields.creator ?? '',
      requiredSigners: Array.isArray(fields.required_signers) ? fields.required_signers : [],
      signedBy: Array.isArray(fields.signed_by) ? fields.signed_by : [],
      createdAt: Number(fields.created_at ?? 0),
      completed: Boolean(fields.completed),
      revoked: Boolean(fields.revoked),
      message: fields.message ?? '',
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Aliases used by pages
// ---------------------------------------------------------------------------

/** Alias: find request by Walrus blob ID */
export const getSigningRequestByBlobId = getRequestByBlobId;

/** Alias: get requests created by this wallet */
export const getSigningRequestsByCreator = getRequestsByCreator;

/** Alias: get requests where this wallet is a required signer */
export const getSigningRequestsByRequiredSigner = getRequestsForSigner;


/**
 * Compute SHA-256 hash of a file/blob as hex string (browser-native).
 */
export async function computeDocumentHash(data: Blob | Uint8Array): Promise<string> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(await (data as Blob).arrayBuffer());
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes as any);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
