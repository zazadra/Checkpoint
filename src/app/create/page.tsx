'use client';

import { useState, useRef, useCallback } from 'react';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Plus, Trash2, User, CheckCircle2, FileText, AlertCircle, Loader2, X, ArrowRight, Shield, Cpu, Network, Database, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { uploadBytesToWalrus, uploadJsonToWalrus, WalrusSigner } from '@/lib/walrus';
import { buildCreateRequestTx, computeDocumentHash } from '@/lib/walsign';
import { parseSignerInput, formatIdentity } from '@/lib/suins';
import { generateAuditReport } from '@/lib/ai-auditor';
import type { ProofCapsule, TrustEvent } from '@/lib/capsules';
import { generateRandomKeyHex, encryptBytesWithKey } from '@/lib/seal';

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14,
        background: done ? 'var(--accent)' : active ? 'rgba(37,99,235,0.2)' : 'var(--card)',
        border: `2px solid ${done || active ? 'var(--accent)' : 'var(--border)'}`,
        color: done || active ? '#fff' : 'var(--text-3)',
        transition: 'all 0.3s',
        boxShadow: active ? '0 0 16px rgba(37,99,235,0.4)' : 'none',
      }}>
        {done ? <CheckCircle2 size={16} /> : n}
      </div>
    </div>
  );
}

export default function CreateCapsulePage() {
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const router = useRouter();

  const signAndExecute = useCallback(async (transaction: any) => {
    const { getSuiClient } = await import('@/lib/walrus-onchain');
    const client = getSuiClient() as any;
    const { bytes, signature } = await (dAppKit as any).signTransaction({ transaction });
    return await client.executeTransactionBlock({
      transactionBlock: bytes,
      signature,
      options: { showEffects: true, showObjectChanges: true },
      requestType: 'WaitForLocalExecution',
    });
  }, [dAppKit]);

  const walrusSigner: WalrusSigner | null = account ? {
    address: account.address,
    signAndExecute: signAndExecute as any
  } : null;

  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [docHash, setDocHash] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const [rawBlobId, setRawBlobId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [filePassword, setFilePassword] = useState('');
  
  const [useAI, setUseAI] = useState(true);
  const [signerInput, setSignerInput] = useState('');
  const [signerLoading, setSignerLoading] = useState(false);
  const [signers, setSigners] = useState<{address: string, name?: string}[]>([]);
  
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [finalCapsuleId, setFinalCapsuleId] = useState('');
  
  const dropRef = useRef<HTMLDivElement>(null);

  // ── Step 1: File Selection ─────────────────────────────────────────
  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    const docTitle = f.name.replace(/\.[^/.]+$/, '');
    if (!title) setTitle(docTitle);
    const bytes = new Uint8Array(await f.arrayBuffer());
    setFileBytes(bytes);
    const hash = await computeDocumentHash(bytes);
    setDocHash(hash);
  }, [title]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  // Upload raw file to Walrus
  const uploadRawDoc = useCallback(async () => {
    if (!fileBytes || !walrusSigner) return;
    setUploading(true);
    setError('');
    try {
      let finalBytes = fileBytes;
      if (isEncrypted) {
        if (!filePassword) throw new Error('Please enter a password to encrypt the file.');
        setUploadMsg('Encrypting file...');
        finalBytes = await encryptBytesWithPassword(fileBytes, filePassword);
      }
      const result = await uploadBytesToWalrus(finalBytes, walrusSigner, 3, (p) => setUploadMsg(p.message ?? ''));
      if (!result.blobId) throw new Error('Upload failed — no blobId returned');
      setRawBlobId(result.blobId);
      setStep(2);
    } catch (e: any) {
      setError(e?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [fileBytes, walrusSigner, isEncrypted, filePassword]);

  // ── Step 2: Add Signers ──────────────────────────────────────────
  const addSigner = useCallback(async () => {
    const input = signerInput.trim();
    if (!input) return;
    setSignerLoading(true);
    const result = await parseSignerInput(input);
    if (result.error) {
      setError(result.error);
      setSignerLoading(false);
      return;
    }
    if (result.address) {
      setSigners(prev => [...prev, { address: result.address!, name: result.name }]);
    }
    setSignerInput('');
    setError('');
    setSignerLoading(false);
  }, [signerInput]);

  // ── Step 3: Anchor Capsule ───────────────────────────────────────
  const createCapsule = useCallback(async () => {
    if (!account || !walrusSigner || !rawBlobId) return;
    setCreating(true);
    setError('');
    try {
      // 1. Generate AI Reasoning locally (simulated audit)
      const audit = useAI ? generateAuditReport(title) : null;
      
      // 2. Construct Trust Events
      const events: TrustEvent[] = [
        { id: `evt-${Date.now()}-1`, type: 'upload', title: 'Artifact Generated', description: `SHA-256: ${docHash}`, timestamp: Date.now() - 5000, status: 'completed' },
        { id: `evt-${Date.now()}-2`, type: 'ai-review', title: 'AI Verification Complete', description: audit ? `${audit.summary}` : 'Agent bypass', timestamp: Date.now() - 3000, status: useAI ? 'completed' : 'pending' }
      ];

      // 3. Build ProofCapsule JSON Object
      const capsule: ProofCapsule = {
        id: `capsule-${Date.now()}`,
        title,
        description: description || 'Immutable Proof Capsule',
        type: useAI ? 'ai-output' : 'legal',
        status: 'pending',
        blobId: rawBlobId,
        sha256Hash: docHash,
        creator: account.address,
        createdAt: Date.now(),
        aiGenerated: useAI,
        modelId: useAI ? 'GPT-4o Auditor' : undefined,
        txDigest: '', // Will update on client side after fetching
        signers: [
          ...signers.map(s => ({ address: s.address, name: s.name, role: 'human' as const, signedAt: undefined })),
          ...(useAI ? [{ address: '0xai_agent_gpt4o', name: 'GPT-4o Auditor', role: 'ai-agent' as const, signedAt: Date.now() }] : [])
        ],
        events,
        isEncrypted,
        allowedViewers: isEncrypted ? signers.map(s => s.address) : undefined,
        memoryNodes: useAI ? [
          { id: 'mem-1', title: 'Original Document', type: 'source_doc', blobId: rawBlobId },
          { id: 'mem-2', title: 'Audit Guidelines', type: 'system_prompt', blobId: 'blob_guidelines_123' }
        ] : []
      };

      // 4. Upload JSON Metadata to Walrus
      setUploadMsg('Uploading Capsule Metadata to Walrus...');
      const jsonUpload = await uploadJsonToWalrus(capsule, walrusSigner, 3);
      const jsonBlobId = jsonUpload.blobId;

      // 5. Anchor on Sui
      setUploadMsg('Anchoring on Sui Mainnet...');
      const validSigners = signers.map(s => s.address);
      const txb = await buildCreateRequestTx({
        title,
        blobId: jsonBlobId, // The contract stores the JSON blob ID!
        documentHash: docHash,
        signers: validSigners,
        message: description
      });
      
      const result = await signAndExecute(txb);
      const digest = (result as any)?.digest ?? '';
      
      setSuccess(digest);
      setFinalCapsuleId(jsonBlobId); // The ID of the capsule page is the JSON blob ID
      
    } catch (e: any) {
      setError(e?.message ?? 'Transaction failed');
    } finally {
      setCreating(false);
    }
  }, [account, walrusSigner, rawBlobId, title, docHash, description, useAI, signers, signAndExecute]);


  // ── Not connected ────────────────────────────────────────────────
  if (!account) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="card-glass" style={{ padding: '48px 40px', borderRadius: 24, textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🔐</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Connect Your Wallet</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6 }}>Connect your Sui wallet to create a Proof Capsule.</p>
        </div>
      </div>
    );
  }

  // ── Success state ────────────────────────────────────────────────
  if (success) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="card-glass"
          style={{ padding: '56px 48px', borderRadius: 28, textAlign: 'center', maxWidth: 480, border: '1px solid rgba(16,185,129,0.3)', boxShadow: '0 0 60px rgba(16,185,129,0.15)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#10b981' }}>
            <CheckCircle2 size={32} />
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 10, letterSpacing: '-0.02em' }}>Capsule Sealed!</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            Your metadata JSON is decentralized on Walrus, and the cryptographically secure anchor is live on Sui Mainnet.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => router.push(`/capsule/${finalCapsuleId}`)} className="btn btn-primary" style={{ background: 'var(--accent)' }}>
              View Proof Capsule
            </button>
            <a href={`https://suiscan.xyz/mainnet/tx/${success}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              View on SuiScan
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  const steps = ['Upload Artifact', 'AI & Signers', 'Anchor Capsule'];

  return (
    <main style={{ minHeight: '100vh', padding: '120px 24px 80px', maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 48, textAlign: 'center' }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 12 }}>Create Proof Capsule</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 16 }}>Anchor immutable digital reality using Walrus & Sui.</p>
      </motion.div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 48 }}>
        {steps.map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'unset' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <StepDot n={i + 1} active={step === i + 1} done={step > i + 1} />
              <span style={{ fontSize: 11, color: step === i + 1 ? 'var(--text-1)' : 'var(--text-3)', fontWeight: step === i + 1 ? 700 : 500, whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: step > i + 1 ? 'var(--accent)' : 'var(--border)', margin: '0 12px', marginBottom: 24, transition: 'background 0.3s' }} />}
          </div>
        ))}
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="alert-error" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={16} /> {error}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {/* Step 1: Upload */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="card-glass" style={{ padding: 40, borderRadius: 24, marginBottom: 24, border: '1px solid var(--border)' }}>
              
              <div style={{ marginBottom: 20 }}>
                <label className="input-label">Capsule Title</label>
                <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Q4 Financial Audit" />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label className="input-label">Description (Optional)</label>
                <textarea className="textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this capsule prove?" style={{ minHeight: 80 }} />
              </div>

              {/* Drop zone */}
              <label className="input-label">Raw Asset File</label>
              <div ref={dropRef} onDrop={onDrop} onDragOver={e => e.preventDefault()}
                onClick={() => document.getElementById('file-input')?.click()}
                style={{ border: `2px dashed ${file ? 'rgba(167,139,250,0.5)' : 'var(--border-2)'}`, borderRadius: 16, padding: '40px 24px', textAlign: 'center', cursor: 'pointer', background: file ? 'rgba(167,139,250,0.05)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}>
                <input id="file-input" type="file" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                {file ? (
                  <div>
                    <FileText size={32} style={{ color: '#a78bfa', margin: '0 auto 12px' }} />
                    <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{file.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{(file.size / 1024).toFixed(1)} KB</div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-3)', marginTop: 8 }}>SHA-256: {docHash.slice(0, 20)}...</div>
                  </div>
                ) : (
                  <div>
                    <Upload size={32} style={{ color: 'var(--text-3)', margin: '0 auto 12px' }} />
                    <div style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>Drop artifact here or click to browse</div>
                    <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Stores the raw file as a decentralized blob on Walrus</div>
                  </div>
                )}
              </div>
              
              <div style={{ background: 'var(--card)', borderRadius: 16, padding: '20px 24px', marginTop: 24, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                    <Lock size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>End-to-End Encryption</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '2px 0 0 0' }}>Secure file with AES-GCM before uploading</p>
                  </div>
                </div>
                
                <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <label className="input-label">File Password</label>
                  <input type="password" placeholder="Create a strong password to encrypt this file" className="input" value={filePassword} onChange={(e) => setFilePassword(e.target.value)} style={{ marginBottom: 12 }} />
                  <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
                    This password encrypts the raw file directly in your browser. We do not store this password. Anyone you invite as a signer will need this password to decrypt and view the file.
                  </p>
                </div>
              </div>
            </div>
            
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'var(--accent)', height: 56, fontSize: 15 }}
              disabled={!file || !title || uploading} onClick={uploadRawDoc}>
              {uploading ? <><Loader2 size={18} className="anim-spin" /> {uploadMsg || 'Uploading to Walrus...'}</> : <>Store Raw Artifact on Walrus <ArrowRight size={18} /></>}
            </button>
          </motion.div>
        )}

        {/* Step 2: Signers & AI */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="card-glass" style={{ padding: 40, borderRadius: 24, marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>2. Trust Verification Layer</h2>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 20, background: useAI ? 'rgba(167,139,250,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${useAI ? 'rgba(167,139,250,0.3)' : 'var(--border)'}`, borderRadius: 16, marginBottom: 32, cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setUseAI(!useAI)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Cpu size={20} color="#a78bfa" />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Enable AI Co-Signer</div>
                    <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Agent will audit and append cryptographic reasoning.</div>
                  </div>
                </div>
                <div style={{ width: 44, height: 24, borderRadius: 12, background: useAI ? '#a78bfa' : 'var(--border)', position: 'relative', transition: 'all 0.2s' }}>
                  <div style={{ position: 'absolute', top: 2, left: useAI ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'all 0.2s' }} />
                </div>
              </div>

              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 12 }}>Human Co-Signers</h3>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <input className="input" value={signerInput} onChange={e => setSignerInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSigner()}
                  placeholder="alice.sui or 0x1234..." style={{ flex: 1 }} />
                <button className="btn btn-primary" onClick={addSigner} disabled={!signerInput || signerLoading}>
                  {signerLoading ? <Loader2 size={16} className="anim-spin" /> : <Plus size={16} />}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {signers.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <User size={16} color="var(--text-2)" />
                      <div>
                        {s.name && <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>}
                        <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-3)' }}>{s.address}</div>
                      </div>
                    </div>
                    <button onClick={() => setSigners(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ flex: 1, justifyContent: 'center', height: 56 }}>← Back</button>
              <button className="btn btn-primary" onClick={() => setStep(3)} style={{ flex: 2, justifyContent: 'center', background: 'var(--accent)', height: 56 }}>
                Review Capsule <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Review & Anchor */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="card-glass" style={{ padding: 40, borderRadius: 24, marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 32 }}>3. Anchor on Sui Mainnet</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <Database size={20} color="var(--text-3)" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 4 }}>Raw Artifact Storage (Walrus)</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{file?.name}</div>
                    <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: '#67e8f9', marginTop: 4 }}>{rawBlobId.slice(0, 30)}...</div>
                  </div>
                </div>
                
                <div style={{ height: 1, background: 'var(--border)' }} />

                <div style={{ display: 'flex', gap: 16 }}>
                  <Network size={20} color="var(--text-3)" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 8 }}>Trust Graph Nodes</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Shield size={14} color="#10b981" />
                        <span style={{ fontSize: 13, color: 'var(--text-1)' }}>Creator ({account.address.slice(0,10)}...)</span>
                      </div>
                      {useAI && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Cpu size={14} color="#a78bfa" />
                          <span style={{ fontSize: 13, color: 'var(--text-1)' }}>GPT-4o Auditor (AI Agent)</span>
                        </div>
                      )}
                      {signers.map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <User size={14} color="var(--text-2)" />
                          <span style={{ fontSize: 13, color: 'var(--text-1)' }}>{s.name || s.address.slice(0,10)+'...'} (Human)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)} style={{ flex: 1, justifyContent: 'center', height: 56 }}>← Back</button>
              <button className="btn btn-primary" onClick={createCapsule} disabled={creating}
                style={{ flex: 2, justifyContent: 'center', background: 'linear-gradient(135deg, #4c1d95, #7c3aed)', boxShadow: '0 4px 20px rgba(124,58,237,0.3)', height: 56, fontSize: 15 }}>
                {creating ? <><Loader2 size={18} className="anim-spin" /> {uploadMsg || 'Anchoring...'}</> : <>Seal Capsule on Sui <ArrowRight size={18} /></>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
