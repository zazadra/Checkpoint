'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Shield, Clock, User, ExternalLink, Download, Loader2, FileText, Lock, Globe, Hash, Key } from 'lucide-react';
import Link from 'next/link';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { getSigningRequestByBlobId, computeDocumentHash } from '@/lib/walsign';
import { resolveAddressesToNames, formatIdentity } from '@/lib/suins';
import { readJsonFromWalrus, getWalrusBlobUrl, getWalrusScanUrl, readBlobFromWalrus } from '@/lib/walrus';
import type { SigningRequest } from '@/types/walsign';
import type { ProofCapsule } from '@/lib/capsules';
import { decryptBytesWithPassword } from '@/lib/seal';

const WALRUS_AGGREGATOR = 'https://aggregator.walrus-mainnet.walrus.space';

type VerifyState = 'idle' | 'fetching' | 'hashing' | 'decrypting' | 'error';

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

export default function VerifyPage() {
  const { blobId: jsonBlobId } = useParams<{ blobId: string }>();
  const account = useCurrentAccount();
  
  const [request, setRequest] = useState<SigningRequest | null>(null);
  const [capsule, setCapsule] = useState<ProofCapsule | null>(null);
  const [nameMap, setNameMap] = useState<Map<string, string | null>>(new Map());
  
  const [state, setState] = useState<VerifyState>('idle');
  const [error, setError] = useState('');
  
  const [password, setPassword] = useState('');
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
  const [decryptedBlob, setDecryptedBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (!jsonBlobId) return;
    setState('fetching');
    
    // Fetch both the Capsule Metadata and the SigningRequest in parallel
    Promise.all([
      readJsonFromWalrus<ProofCapsule>(jsonBlobId).catch(() => null),
      getSigningRequestByBlobId(jsonBlobId).catch(() => null)
    ]).then(async ([cap, req]) => {
      if (cap) setCapsule(cap);
      if (req) {
        setRequest(req);
        const names = await resolveAddressesToNames([...req.requiredSigners, req.creator]);
        setNameMap(names);
      }
      setState('idle');
    }).catch(e => {
      setError('Failed to fetch document metadata.');
      setState('error');
    });
  }, [jsonBlobId]);

  const handleDecrypt = async () => {
    if (!capsule || !capsule.blobId) return;
    if (!password) {
      setError('Password is required');
      return;
    }
    
    // Authorization Check
    const allowed = capsule.allowedViewers || [];
    if (account && allowed.length > 0 && !allowed.includes(account.address)) {
      setError('Your wallet address is not on the allowed viewers list.');
      return;
    } else if (!account && allowed.length > 0) {
      setError('Please connect your wallet to verify authorization.');
      return;
    }

    setState('decrypting');
    setError('');
    
    try {
      const encryptedBytes = await readBlobFromWalrus(capsule.blobId);
      const decryptedBytes = await decryptBytesWithPassword(encryptedBytes, password);
      
      const mime = capsule.contentType || 'application/octet-stream';
      const blob = new Blob([decryptedBytes], { type: mime });
      const url = URL.createObjectURL(blob);
      setDecryptedBlob(blob);
      setDecryptedUrl(url);
      setState('idle');
    } catch (e: any) {
      console.error(e);
      setError('Decryption failed. Incorrect password or corrupt data.');
      setState('idle');
    }
  };

  const handleDownload = () => {
    if (!capsule) return;
    if (capsule.isEncrypted && decryptedUrl) {
      const a = document.createElement('a');
      a.href = decryptedUrl;
      a.download = capsule.title || 'decrypted_file';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (!capsule.isEncrypted) {
      window.open(`${WALRUS_AGGREGATOR}/v1/blobs/${capsule.blobId}`, '_blank');
    }
  };

  const status = request ? (request.revoked ? 'revoked' : request.completed ? 'completed' : 'pending') : null;

  return (
    <main style={{ minHeight: '100vh', padding: '100px 24px 80px', maxWidth: 680, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--accent-2)' }}>
            <Shield size={28} />
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 8 }}>Document Record</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 15 }}>Private. Permanent. Verifiable.</p>
        </div>

        {state === 'fetching' && (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-2)' }}>
            <Loader2 size={32} className="anim-spin" style={{ margin: '0 auto 12px', color: 'var(--accent-2)' }} />
            <p>Looking up record on Sui & Walrus...</p>
          </div>
        )}

        {state === 'error' && (
          <div className="alert-error" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
            <XCircle size={16} /> {error}
          </div>
        )}
        
        {/* If there is an error but state wasn't updated correctly, show it */}
        {error && state !== 'error' && (
          <div className="alert-error" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
            <XCircle size={16} /> {error}
          </div>
        )}

        {capsule && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            
            <div style={{ background: 'rgba(7,12,26,0.9)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={20} color="#a78bfa" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{capsule.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{capsule.blobSize ? formatBytes(capsule.blobSize) : 'Unknown size'} · {capsule.contentType || 'Unknown type'}</div>
                </div>
                {capsule.isEncrypted ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 999, fontSize: 11, fontWeight: 700, color: '#f43f5e' }}>
                    <Lock size={10} /> Encrypted
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 999, fontSize: 11, fontWeight: 700, color: '#10b981' }}>
                    <Globe size={10} /> Public
                  </div>
                )}
              </div>

              {capsule.isEncrypted && !decryptedUrl && (
                <div style={{ padding: '24px', background: 'rgba(244,63,94,0.03)' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: '#f43f5e' }}>
                    <Key size={14} /> Encrypted Document
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.5 }}>
                    This document is encrypted. Only authorized viewers with the correct password can decrypt and view it locally.
                  </p>
                  
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input 
                      type="password" 
                      placeholder="Enter Decryption Password" 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="input"
                      style={{ flex: 1 }}
                    />
                    <button 
                      onClick={handleDecrypt} 
                      disabled={state === 'decrypting'}
                      className="btn"
                      style={{ background: '#f43f5e', color: '#fff' }}
                    >
                      {state === 'decrypting' ? <Loader2 size={16} className="anim-spin" /> : 'Decrypt'}
                    </button>
                  </div>
                  
                  {capsule.allowedViewers && capsule.allowedViewers.length > 0 && (
                    <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-3)' }}>
                      <strong>Allowed Wallets:</strong> {capsule.allowedViewers.length} address(es) whitelist enforced.
                    </div>
                  )}
                </div>
              )}

              {/* Document Preview (Decrypted or Public) */}
              {(!capsule.isEncrypted || decryptedUrl) && (
                <div style={{ padding: '24px' }}>
                  <div style={{ 
                    width: '100%', 
                    height: 480, 
                    borderRadius: 12, 
                    overflow: 'hidden', 
                    background: '#0b0f19', 
                    border: '1px solid var(--border)',
                    marginBottom: 16
                  }}>
                    <iframe 
                      src={capsule.isEncrypted ? (decryptedUrl || '') : `${WALRUS_AGGREGATOR}/v1/blobs/${capsule.blobId}`} 
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      title="Walrus Document Preview"
                    />
                  </div>
                  <button onClick={handleDownload} className="btn" style={{ width: '100%', justifyContent: 'center', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', color: 'var(--accent-2)', gap: 8 }}>
                    <Download size={14} /> Download Original File
                  </button>
                </div>
              )}
            </div>

            {/* Request Card (If found on Sui) */}
            {request && (
              <div className="card-glass" style={{ padding: 28, borderRadius: 22, marginBottom: 24, border: status === 'completed' ? '1px solid rgba(245,158,11,0.25)' : '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Sui Anchor</h2>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-3)', flexWrap: 'wrap' }}>
                      <span><Clock size={11} style={{ verticalAlign: 'middle' }} /> {new Date(request.createdAt).toLocaleDateString()}</span>
                      <span>By {formatIdentity(request.creator, nameMap.get(request.creator))}</span>
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, flexShrink: 0,
                    background: status === 'completed' ? 'rgba(245,158,11,0.12)' : status === 'revoked' ? 'rgba(239,68,68,0.1)' : 'rgba(37,99,235,0.1)',
                    color: status === 'completed' ? '#f59e0b' : status === 'revoked' ? '#f87171' : '#60a5fa',
                    border: `1px solid ${status === 'completed' ? 'rgba(245,158,11,0.25)' : status === 'revoked' ? 'rgba(239,68,68,0.2)' : 'rgba(37,99,235,0.25)'}`,
                  }}>
                    {status === 'completed' ? '✓ Fully Signed' : status === 'revoked' ? 'Revoked' : 'Pending'}
                  </span>
                </div>

                <div style={{ padding: '14px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Document SHA-256</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-2)', wordBreak: 'break-all' }}>{request.documentHash}</div>
                </div>

                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Signers ({request.signedBy.length}/{request.requiredSigners.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {request.requiredSigners.map((addr, i) => {
                    const signed = request.signedBy.includes(addr);
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                        {signed ? <CheckCircle2 size={16} style={{ color: '#f59e0b', flexShrink: 0 }} /> : <User size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} />}
                        <span style={{ color: signed ? 'var(--text-1)' : 'var(--text-3)' }}>{formatIdentity(addr, nameMap.get(addr))}</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)' }}>{addr.slice(0, 10)}...{addr.slice(-6)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href={getWalrusScanUrl(capsule.blobId)} target="_blank" rel="noopener noreferrer"
                style={{ flex: '1 1 120px', height: 44, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 11, color: 'var(--text-2)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}>
                <ExternalLink size={13} /> View on WalrusScan
              </a>
              <Link href="/verify" style={{ height: 44, padding: '0 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 11, color: 'var(--text-3)', fontSize: 13, display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                ← Verify Another
              </Link>
            </div>
            
          </motion.div>
        )}

      </motion.div>
    </main>
  );
}
