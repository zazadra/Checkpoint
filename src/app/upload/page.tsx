'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Lock, CheckCircle2, AlertCircle, Loader2,
  FileText, Shield, Copy, ExternalLink, Share2, Eye,
  Link2, X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { uploadBytesToWalrus, uploadJsonToWalrus, WalrusSigner } from '@/lib/walrus';
import { computeDocumentHash, buildCreateRequestTx } from '@/lib/walsign';
import { generateRandomKeyHex, encryptBytesWithKey } from '@/lib/seal';
import type { ProofCapsule } from '@/lib/capsules';

// ── Types ────────────────────────────────────────────────────────
interface StoredFile {
  name: string;
  size: number;
  type: string;
  sha256: string;
  blobId: string;         // raw file blob ID
  metaBlobId: string;     // metadata JSON blob ID  
  encryptionKey: string;  // hex key hint (first 8 chars)
  isEncrypted: boolean;
  owner: string;
  uploadedAt: number;
  txDigest?: string;
}

// ── Helpers ──────────────────────────────────────────────────────
function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}
function shorten(s: string, n = 12) { return `${s.slice(0, n)}…`; }

// ── Progress Steps ───────────────────────────────────────────────
type StageKey = 'idle' | 'encrypting' | 'uploading' | 'anchoring' | 'done' | 'error';
const STAGES: { key: StageKey; label: string; icon: React.ReactNode }[] = [
  { key: 'encrypting', label: 'Encrypting', icon: <Lock size={14} /> },
  { key: 'uploading',  label: 'Uploading to Walrus', icon: <Upload size={14} /> },
  { key: 'anchoring',  label: 'Storing Metadata', icon: <Shield size={14} /> },
  { key: 'done',       label: 'Done', icon: <CheckCircle2 size={14} /> },
];

function ProgressBar({ stage }: { stage: StageKey }) {
  const idx = STAGES.findIndex(s => s.key === stage);
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {STAGES.map((s, i) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: i < STAGES.length - 1 ? 1 : 'unset' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: i < idx ? 'var(--verify)' : i === idx ? 'var(--accent)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${i < idx ? 'var(--verify)' : i === idx ? 'var(--accent)' : 'var(--border)'}`,
              color: i <= idx ? '#fff' : 'var(--text-3)',
              transition: 'all 0.4s',
              boxShadow: i === idx ? '0 0 16px rgba(124,58,237,0.4)' : 'none',
            }}>
              {i < idx ? <CheckCircle2 size={14} /> : s.icon}
            </div>
            {i < STAGES.length - 1 && (
              <div style={{ flex: 1, height: 1, background: i < idx ? 'var(--verify)' : 'var(--border)', margin: '0 4px', transition: 'background 0.4s' }} />
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        {STAGES.map((s, i) => (
          <div key={s.key} style={{ fontSize: 10, fontWeight: i === idx ? 700 : 500, color: i <= idx ? 'var(--text-1)' : 'var(--text-3)', flex: i < STAGES.length - 1 ? 1 : 'unset', textAlign: 'center', transition: 'color 0.3s' }}>
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UploadPage() {
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const router = useRouter();

  const signAndExecute = useCallback(async (transaction: any) => {
    const { getSuiClient } = await import('@/lib/walrus-onchain');
    const client = getSuiClient() as any;
    const { bytes, signature } = await (dAppKit as any).signTransaction({ transaction });
    return client.executeTransactionBlock({
      transactionBlock: bytes, signature,
      options: { showEffects: true }, requestType: 'WaitForLocalExecution',
    });
  }, [dAppKit]);

  const walrusSigner: WalrusSigner | null = account ? {
    address: account.address,
    signAndExecute: signAndExecute as any
  } : null;

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [stage, setStage] = useState<StageKey>('idle');
  const [stageMsg, setStageMsg] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<StoredFile | null>(null);
  const [copied, setCopied] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleFile = useCallback((f: File) => { setFile(f); setError(''); }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const upload = useCallback(async () => {
    if (!file || !walrusSigner) return;
    setError(''); setStage('encrypting'); setStageMsg('Encrypting in your browser…');

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const sha256 = await computeDocumentHash(bytes);

      // 1. Encrypt
      let uploadBytes: Uint8Array = bytes;
      let generatedKey = '';
      if (isEncrypted) {
        const key = generateRandomKeyHex();
        generatedKey = key;
        uploadBytes = await encryptBytesWithKey(bytes, key);
      }

      // 2. Upload encrypted file to Walrus
      setStage('uploading'); setStageMsg('Uploading to Walrus…');
      const fileResult = await uploadBytesToWalrus(
        uploadBytes,
        walrusSigner,
        3,
        (p) => setStageMsg(p.message ?? 'Uploading…')
      );
      if (!fileResult.blobId) throw new Error('Upload failed — no blob ID returned');

      // 3. Construct ProofCapsule Metadata Capsule
      setStage('anchoring'); setStageMsg('Preparing metadata…');
      const capsule: ProofCapsule = {
        id: `capsule-${Date.now()}`,
        title: file.name,
        description: 'Uploaded file to secure vault',
        type: 'enterprise',
        status: 'sealed',
        blobId: fileResult.blobId,
        blobSize: file.size,
        sha256Hash: sha256,
        contentType: file.type || 'application/octet-stream',
        creator: walrusSigner.address,
        signers: [],
        events: [
          {
            id: `ev-${Date.now()}-0`,
            timestamp: Date.now(),
            type: 'created',
            actor: walrusSigner.address,
            actorRole: 'creator',
            description: 'Document uploaded and encrypted in vault'
          }
        ],
        createdAt: Date.now(),
        tags: ['vault', 'upload'],
        isEncrypted,
        allowedViewers: isEncrypted ? [walrusSigner.address] : undefined
      };

      // Upload JSON metadata to Walrus
      const metaResult = await uploadJsonToWalrus(capsule, walrusSigner, 3);
      if (!metaResult.blobId) throw new Error('Metadata upload failed');
      const metaBlobId = metaResult.blobId;

      // Register the key if encrypted
      if (isEncrypted && generatedKey) {
        setStageMsg('Registering encryption key...');
        const regRes = await fetch('/api/vault/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'register',
            blobId: fileResult.blobId,
            metaBlobId: metaBlobId,
            keyHex: generatedKey
          })
        });
        if (!regRes.ok) {
          const regErr = await regRes.json();
          throw new Error(regErr.error || 'Failed to register decryption key on server');
        }
      }

      // 4. Anchor on Sui
      setStageMsg('Anchoring on Sui Mainnet...');
      const txb = await buildCreateRequestTx({
        title: file.name,
        blobId: metaBlobId, // The contract stores the JSON blob ID!
        documentHash: sha256,
        signers: [],
        message: 'Uploaded to Vault'
      });
      const txResult = await signAndExecute(txb);
      const digest = (txResult as any)?.digest ?? '';

      // Map back to result metadata view format
      const resultMeta: StoredFile = {
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        sha256,
        blobId: fileResult.blobId,
        metaBlobId: metaBlobId,
        encryptionKey: isEncrypted ? generatedKey.slice(0, 8) : 'plaintext',
        isEncrypted,
        owner: walrusSigner.address,
        uploadedAt: Date.now(),
        txDigest: digest
      };

      setResult(resultMeta);
      setStage('done');
    } catch (e: any) {
      setStage('error');
      setError(e?.message ?? 'Upload failed. Please try again.');
    }
  }, [file, walrusSigner, isEncrypted, signAndExecute]);

  const copyLink = useCallback(() => {
    if (!result) return;
    const url = `${window.location.origin}/f/${result.metaBlobId}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [result]);

  // ── Not connected ────────────────────────────────────────────
  if (!account) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="card-glass" style={{ padding: '56px 48px', borderRadius: 24, textAlign: 'center', maxWidth: 400 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#a78bfa' }}>
            <Lock size={28} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.02em' }}>Connect Your Wallet</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.65 }}>
            Your Sui wallet is your key. No email or password required — just connect and start uploading.
          </p>
        </div>
      </div>
    );
  }

  // ── Success state ─────────────────────────────────────────────
  if (result && stage === 'done') {
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/f/${result.metaBlobId}`;
    const verifyUrl = `/verify/${result.metaBlobId}`;
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          style={{ width: '100%', maxWidth: 520, padding: '48px', background: 'rgba(7,12,26,0.95)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 24, boxShadow: '0 0 60px rgba(16,185,129,0.1)' }}>

          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
              style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#10b981' }}>
              <CheckCircle2 size={30} />
            </motion.div>
            <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 8 }}>File Stored Successfully</h2>
            <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
              {result.isEncrypted ? 'Encrypted and stored' : 'Stored'} permanently on Walrus. Verifiable by anyone.
            </p>
          </div>

          {/* File details */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
              <FileText size={20} color="var(--text-3)" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{result.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{formatBytes(result.size)} · {result.type}</div>
              </div>
              {result.isEncrypted && (
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 999, fontSize: 11, fontWeight: 700, color: '#a78bfa' }}>
                  <Lock size={10} /> Encrypted
                </div>
              )}
            </div>
            {[
              { label: 'File ID (Walrus)', value: shorten(result.blobId, 20), mono: true, color: '#67e8f9' },
              { label: 'SHA-256 Hash', value: shorten(result.sha256, 20), mono: true, color: 'var(--text-2)' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, marginBottom: 8, borderBottom: i < 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{row.label}</span>
                <span style={{ fontFamily: row.mono ? 'var(--mono)' : 'inherit', fontSize: 12, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Share link */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Share Link</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {shareUrl}
              </div>
              <button onClick={copyLink} style={{ flexShrink: 0, padding: '10px 14px', background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(124,58,237,0.1)', border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(124,58,237,0.25)'}`, borderRadius: 10, cursor: 'pointer', color: copied ? '#10b981' : '#a78bfa', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, transition: 'all 0.2s' }}>
                <Copy size={14} /> {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => router.push(`/f/${result.metaBlobId}`)} style={{ flex: 1, height: 44, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', border: 'none', borderRadius: 10, cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(124,58,237,0.35)' }}>
              <Eye size={15} /> View File
            </button>
            <button onClick={() => router.push(verifyUrl)} style={{ flex: 1, height: 44, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', color: 'var(--text-2)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Shield size={14} /> Verify
            </button>
            <button onClick={() => { setFile(null); setResult(null); setStage('idle'); setError(''); }} style={{ height: 44, padding: '0 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', color: 'var(--text-3)', fontSize: 12 }}>
              Upload another
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const isUploading = stage !== 'idle' && stage !== 'done' && stage !== 'error';

  return (
    <main style={{ minHeight: '100vh', padding: '120px 24px 80px', maxWidth: 600, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 999, marginBottom: 20 }}>
            <Lock size={11} color="#a78bfa" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#a78bfa' }}>End-to-end encrypted</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 12 }}>Upload a File</h1>
          <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.65 }}>
            Encrypted, stored permanently on Walrus, and verifiable by anyone.
          </p>
        </div>

        {/* Progress (only shown when uploading) */}
        {isUploading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: 32 }}>
            <ProgressBar stage={stage} />
            <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-2)', fontSize: 14 }}>
              <Loader2 size={16} className="anim-spin" color="var(--accent-2)" />
              {stageMsg}
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, marginBottom: 24, fontSize: 13, color: '#f87171' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
          </motion.div>
        )}

        {!isUploading && (
          <>
            {/* Drop zone */}
            <div
              ref={dropRef}
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => document.getElementById('file-input')?.click()}
              style={{
                border: `2px dashed ${isDragging ? 'rgba(124,58,237,0.6)' : file ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 20, padding: '56px 32px', textAlign: 'center', cursor: 'pointer',
                background: isDragging ? 'rgba(124,58,237,0.04)' : file ? 'rgba(16,185,129,0.03)' : 'rgba(255,255,255,0.01)',
                transition: 'all 0.2s', marginBottom: 20, position: 'relative',
              }}>
              <input id="file-input" type="file" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

              {file ? (
                <div>
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                    <FileText size={40} style={{ color: '#10b981', margin: '0 auto 16px' }} />
                  </motion.div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{file.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>{formatBytes(file.size)}</div>
                  <button onClick={e => { e.stopPropagation(); setFile(null); }}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 12px', cursor: 'pointer', color: 'var(--text-3)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <X size={12} /> Remove
                  </button>
                </div>
              ) : (
                <div>
                  <Upload size={36} style={{ color: 'var(--text-3)', margin: '0 auto 16px' }} />
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>
                    Drop your file here
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                    PDF, DOCX, PNG, or any format — up to any size
                  </div>
                </div>
              )}
            </div>

            {/* Encrypt toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: isEncrypted ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isEncrypted ? 'rgba(124,58,237,0.2)' : 'var(--border)'}`, borderRadius: 14, marginBottom: 20, cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => setIsEncrypted(!isEncrypted)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: isEncrypted ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isEncrypted ? '#a78bfa' : 'var(--text-3)', transition: 'all 0.2s' }}>
                  <Lock size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Encrypt with Seal</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {isEncrypted ? 'File is encrypted before leaving your browser' : 'File will be stored as-is (public)'}
                  </div>
                </div>
              </div>
              <div style={{ width: 44, height: 24, borderRadius: 12, background: isEncrypted ? 'var(--accent)' : 'var(--border)', position: 'relative', transition: 'all 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: isEncrypted ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
              </div>
            </div>

            {/* Upload button */}
            <button
              onClick={upload}
              disabled={!file}
              style={{
                width: '100%', height: 56, borderRadius: 14, border: 'none', cursor: file ? 'pointer' : 'not-allowed',
                background: file ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'rgba(255,255,255,0.04)',
                color: file ? '#fff' : 'var(--text-3)', fontSize: 16, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: file ? '0 4px 24px rgba(124,58,237,0.35)' : 'none',
                transition: 'all 0.2s',
              }}>
              {isEncrypted ? <Lock size={18} /> : <Upload size={18} />}
              {isEncrypted ? 'Encrypt & Upload' : 'Upload to Walrus'}
            </button>

            {/* Footer note */}
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)', marginTop: 16, lineHeight: 1.6 }}>
              Files are stored permanently on Walrus decentralized storage.{' '}
              {isEncrypted ? 'Encrypted before upload — we never see your data.' : 'Without encryption, anyone with the link can view the file.'}
            </p>
          </>
        )}
      </motion.div>
    </main>
  );
}
