'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Lock, Upload, Shield, Eye, Clock, FileText, Loader2,
  AlertCircle, CheckCircle2, Globe, Copy, ExternalLink, Hash
} from 'lucide-react';
import { fetchAllSigningRequests } from '@/lib/tatum';
import { parseSuiSigningRequest } from '@/lib/walsign';
import type { SigningRequest } from '@/types/walsign';
import { getRequestStatus } from '@/types/walsign';
import { readJsonFromWalrus } from '@/lib/walrus';
import type { ProofCapsule } from '@/lib/capsules';

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

function shorten(s: string, n = 8) { return `${s.slice(0, n)}…${s.slice(-5)}`; }

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; border: string }> = {
    pending:   { color: '#fbbf24', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
    completed: { color: '#34d399', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)' },
    revoked:   { color: '#f87171', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)' },
  };
  const s = map[status] ?? { color: 'var(--text-3)', bg: 'rgba(255,255,255,0.04)', border: 'var(--border)' };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: s.bg, border: `1px solid ${s.border}`, color: s.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {status}
    </span>
  );
}

export default function VaultPage() {
  const account = useCurrentAccount();
  const [requests, setRequests] = useState<SigningRequest[]>([]);
  const [capsules, setCapsules] = useState<Record<string, ProofCapsule>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!account) return;
    setLoading(true);
    fetchAllSigningRequests()
      .then(async raw => {
        const all = raw.map(parseSuiSigningRequest).filter((r): r is SigningRequest => r !== null);
        
        // Fetch JSON blobs from Walrus to get real metadata
        const metadataMap: Record<string, ProofCapsule> = {};
        await Promise.all(all.map(async r => {
          try {
            if (r.blobId) {
              const json = await readJsonFromWalrus<ProofCapsule>(r.blobId);
              metadataMap[r.objectId] = json;
            }
          } catch (e) {
            if (!(e instanceof SyntaxError)) {
              console.error('Failed to fetch blob for', r.objectId, e);
            }
          }
        }));
        
        setCapsules(metadataMap);
        
        setRequests(all.filter(r => {
          const cap = metadataMap[r.objectId];
          if (!cap || !cap.title) return false; // Filter out legacy documents before refactor
          const isCreator = r.creator === account.address;
          const isSigner = r.requiredSigners.includes(account.address);
          const isViewer = cap?.allowedViewers?.includes(account.address);
          return isCreator || isSigner || isViewer;
        }));
      })
      .catch(e => setError(e?.message ?? 'Failed to load'))
      .finally(() => setLoading(false));
  }, [account]);

  if (!account) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 400, padding: '56px 40px', background: 'rgba(7,12,26,0.9)', border: '1px solid var(--border)', borderRadius: 20, textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#a78bfa' }}>
            <Lock size={26} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.02em' }}>Connect Your Wallet</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.65, marginBottom: 28 }}>
            Connect your Sui wallet to access your private vault — all your encrypted files in one place.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Encrypted Storage', 'Wallet-Gated', 'Permanent'].map(t => (
              <span key={t} style={{ fontSize: 11, padding: '3px 10px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 999, color: '#a78bfa', fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const pending = requests.filter(r => getRequestStatus(r) === 'pending' && r.requiredSigners.includes(account.address) && !r.signedBy.includes(account.address));
  const completed = requests.filter(r => getRequestStatus(r) === 'completed');

  return (
    <main style={{ minHeight: '100vh', padding: '110px 24px 80px', maxWidth: 900, margin: '0 auto' }}>
      <motion.div initial="hidden" animate="show" variants={stagger}>

        {/* Header */}
        <motion.div variants={fadeUp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
              {shorten(account.address)}
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 8 }}>My Vault</h1>
            <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Your private, permanent, and verifiable files.</p>
          </div>
          <Link href="/upload" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 20px',
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', borderRadius: 12,
            color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
          }}>
            <Upload size={16} /> Upload File
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 40 }}>
          {[
            { label: 'Total Files', value: requests.length, color: 'var(--accent-2)' },
            { label: 'Action Needed', value: pending.length, color: pending.length > 0 ? '#fbbf24' : '#34d399' },
            { label: 'Completed', value: completed.length, color: '#34d399' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '18px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: s.color, fontFamily: 'var(--mono)', lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </motion.div>

        {/* Action needed banner */}
        {pending.length > 0 && (
          <motion.div variants={fadeUp} style={{ padding: '16px 20px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertCircle size={18} color="#fbbf24" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>You have {pending.length} file{pending.length > 1 ? 's' : ''} awaiting your signature</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Review and cryptographically sign the documents waiting for your approval.</div>
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: '14px 18px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, marginBottom: 24, fontSize: 13, color: '#f87171', display: 'flex', gap: 10, alignItems: 'center' }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Signing Requests Section */}
        <motion.div variants={fadeUp}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={16} color="var(--text-3)" /> Vault Documents
            </h2>
            <Link href="/create" style={{ fontSize: 13, color: 'var(--accent-2)', textDecoration: 'none', fontWeight: 600 }}>
              + New Document
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <Loader2 size={24} className="anim-spin" style={{ color: 'var(--accent-2)', margin: '0 auto' }} />
            </div>
          ) : requests.length === 0 ? (
            <div style={{ padding: '48px 32px', textAlign: 'center', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border)', borderRadius: 16 }}>
              <Shield size={32} style={{ color: 'var(--text-3)', margin: '0 auto 16px', opacity: 0.4 }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>No documents in vault yet</div>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>Upload and encrypt a file to get started.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <Link href="/upload" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 10, color: '#a78bfa', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
                  <Upload size={14} /> Upload File
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <AnimatePresence>
                {requests.map(req => {
                  const s = getRequestStatus(req);
                  const needsSign = s === 'pending' && req.requiredSigners.includes(account.address) && !req.signedBy.includes(account.address);
                  return (
                    <motion.div key={req.objectId} variants={fadeUp} layout
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                        background: needsSign ? 'rgba(245,158,11,0.03)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${needsSign ? 'rgba(245,158,11,0.2)' : 'var(--border)'}`,
                        borderRadius: 14, transition: 'all 0.2s',
                      }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#a78bfa' }}>
                        <FileText size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                          {capsules[req.objectId]?.isEncrypted ? (
                            <Lock size={12} color="#f43f5e" />
                          ) : null}
                          <span style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {capsules[req.objectId]?.title || req.title}
                          </span>
                          <StatusPill status={s} />
                          {needsSign && <span style={{ fontSize: 9, fontWeight: 800, color: '#fbbf24', background: 'rgba(245,158,11,0.1)', padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action needed</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', gap: 10 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={9} /> {new Date(req.createdAt).toLocaleDateString()}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Hash size={9} /> {req.signedBy.length}/{req.requiredSigners.length} signed</span>
                          {capsules[req.objectId]?.blobSize ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <FileText size={9} /> {formatBytes(capsules[req.objectId].blobSize)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {needsSign ? (
                          <Link href={`/sign/${req.objectId}`} style={{ padding: '7px 14px', background: '#fbbf24', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>
                            Sign Now
                          </Link>
                        ) : (
                          <Link href={`/sign/${req.objectId}`} style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                            View
                          </Link>
                        )}
                        {req.blobId && (
                          <Link href={`/verify/${req.blobId}`} style={{ padding: '7px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-3)', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                            <Eye size={13} />
                          </Link>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

      </motion.div>
    </main>
  );
}
