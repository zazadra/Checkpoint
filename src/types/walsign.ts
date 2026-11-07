/**
 * WalSign — Shared TypeScript Types
 */

// ---------------------------------------------------------------------------
// Core domain types
// ---------------------------------------------------------------------------

export interface SigningRequest {
  /** Sui object ID of this SigningRequest */
  objectId: string;
  /** Human-readable document title */
  title: string;
  /** Walrus blob ID where document is stored */
  blobId: string;
  /** SHA-256 hex hash of the document */
  documentHash: string;
  /** Creator's wallet address */
  creator: string;
  /** Wallet addresses required to sign */
  requiredSigners: string[];
  /** Wallet addresses that have signed */
  signedBy: string[];
  /** Unix timestamp ms */
  createdAt: number;
  /** All required signers have signed */
  completed: boolean;
  /** Creator revoked before completion */
  revoked: boolean;
  /** Optional message from creator */
  message: string;
}

/** A signer entry with optional SuiNS name resolved */
export interface SignerEntry {
  address: string;
  name: string | null; // .sui name if available
  hasSigned: boolean;
}

/** Status of a signing request */
export type RequestStatus = 'pending' | 'completed' | 'revoked';

export function getRequestStatus(req: SigningRequest): RequestStatus {
  if (req.revoked) return 'revoked';
  if (req.completed) return 'completed';
  return 'pending';
}

// ---------------------------------------------------------------------------
// UI types
// ---------------------------------------------------------------------------

/** Input state for adding a signer in the Create flow */
export interface SignerInputState {
  raw: string;            // what user typed
  address: string | null; // resolved address
  name: string | null;    // resolved .sui name
  error: string | null;
  loading: boolean;
}

/** Upload progress for document upload */
export interface UploadProgress {
  step: 'encoding' | 'checking' | 'registering' | 'uploading' | 'certifying' | 'done';
  message: string;
  percent: number;
}

/** Verification result */
export interface VerificationResult {
  valid: boolean;
  hashMatch: boolean;
  computedHash: string;
  storedHash: string;
  request: SigningRequest | null;
  error?: string;
}
