'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useCurrentAccount, useDAppKit, CurrentAccountSigner } from '@mysten/dapp-kit-react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, User, FileText, AlertCircle, Loader2, ExternalLink, Shield, Copy, Check } from 'lucide-react';
import { getSigningRequest, buildSignDocumentTx } from '@/lib/walsign';
import { resolveAddressesToNames, formatIdentity } from '@/lib/suins';
import { getRequestStatus } from '@/types/walsign';
import type { SigningRequest } from '@/types/walsign';
import { downloadCertificate } from '@/lib/certificate';
import { generateAuditReport } from '@/lib/ai-auditor';
import type { AuditReport } from '@/lib/ai-auditor';

const WALRUS_AGGREGATOR = 'https://aggregator.walrus-mainnet.walrus.space';

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; color: string; bg: string }> = {
    pending:   { label: 'Pending Signatures', color: '#60a5fa', bg: 'rgba(37,99,235,0.1)' },
    completed: { label: 'Fully Signed ✓',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    revoked:   { label: 'Revoked',             color: '#f87171', bg: 'rgba(239,68,68,0.1)' },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <span style={{ padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: c.bg, color: c.color, border: `1px solid ${c.color}30` }}>
      {c.label}
    </span>
  );
}

function SignerRow({ address, name, hasSigned }: { address: string; name: string | null; hasSigned: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: hasSigned ? 'rgba(245,158,11,0.06)' : 'var(--card)', border: `1px solid ${hasSigned ? 'rgba(245,158,11,0.2)' : 'var(--border)'}`, borderRadius: 12, transition: 'all 0.2s' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: hasSigned ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {hasSigned ? <CheckCircle2 size={18} style={{ color: '#f59e0b' }} /> : <User size={16} style={{ color: 'var(--text-3)' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {name && <div style={{ fontSize: 14, fontWeight: 600, color: hasSigned ? '#f59e0b' : 'var(--text-1)' }}>{name}</div>}
        <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{address}</div>
      </div>
      <button onClick={copy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4, display: 'flex' }}>
        {copied ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
      </button>
      <span style={{ fontSize: 11, fontWeight: 600, color: hasSigned ? '#f59e0b' : 'var(--text-3)', flexShrink: 0 }}>
        {hasSigned ? 'Signed' : 'Pending'}
      </span>
    </div>
  );
}

export default function SignPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const signAndExecute = useCallback(async ({ transaction }: { transaction: any }) => {
    const signer = new CurrentAccountSigner(dAppKit as any);
    return await signer.signAndExecuteTransaction({ transaction });
  }, [dAppKit]);

  const [request, setRequest] = useState<SigningRequest | null>(null);
  const [nameMap, setNameMap] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');
  const [signedTx, setSignedTx] = useState('');
  
  const [aiAuditing, setAiAuditing] = useState(false);
  const [aiReport, setAiReport] = useState<AuditReport | null>(null);

  useEffect(() => {
    if (!requestId) return;
    setLoading(true);
    getSigningRequest(requestId)
      .then(async (r) => {
        setRequest(r);
        if (r) {
          const allAddresses = [...r.requiredSigners, r.creator];
          const names = await resolveAddressesToNames(allAddresses);
          setNameMap(names);
          
          // Trigger AI Legal Co-Pilot Audit
          setAiAuditing(true);
          setTimeout(() => {
            const report = generateAuditReport(r.title);
            setAiReport(report);
            setAiAuditing(false);
          }, 1500);
        }
      })
      .catch(e => setError(e?.message ?? 'Failed to load request'))
      .finally(() => setLoading(false));
  }, [requestId]);

  const handleSign = async () => {
    if (!account || !request) return;
    setSigning(true);
    setError('');
    try {
      const txb = await buildSignDocumentTx({ requestObjectId: requestId });
      const result = await signAndExecute({ transaction: txb as any } as any);
      setSignedTx((result as any)?.digest ?? '');
      // Refresh
      const updated = await getSigningRequest(requestId);
      setRequest(updated);
    } catch (e: any) {
      setError(e?.message ?? 'Signing failed');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Loader2 size={32} className="anim-spin" style={{ color: 'var(--accent-2)' }} />
          <p style={{ color: 'var(--text-2)' }}>Loading signing request...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="card-glass" style={{ padding: '48px', borderRadius: 24, textAlign: 'center', maxWidth: 400 }}>
          <AlertCircle size={40} style={{ color: 'var(--error)', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Request Not Found</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>This signing request doesn't exist or hasn't been indexed yet.</p>
        </div>
      </div>
    );
  }

  const status = getRequestStatus(request);
  const isRequiredSigner = account && request.requiredSigners.includes(account.address);
  const hasSigned = account && request.signedBy.includes(account.address);
  const signedCount = request.signedBy.length;
  const totalCount = request.requiredSigners.length;
  const progress = totalCount > 0 ? (signedCount / totalCount) * 100 : 0;

  return (
    <main style={{ minHeight: '100vh', padding: '100px 24px 80px', maxWidth: 760, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em' }}>{request.title}</h1>
            <StatusBadge status={status} />
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-3)', flexWrap: 'wrap' }}>
            <span>Created by <strong style={{ color: 'var(--text-2)' }}>{formatIdentity(request.creator, nameMap.get(request.creator))}</strong></span>
            <span><Clock size={12} style={{ verticalAlign: 'middle' }} /> {new Date(request.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="card-glass" style={{ padding: 24, borderRadius: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Signature Progress</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--accent-2)', fontWeight: 700 }}>{signedCount} / {totalCount}</span>
          </div>
          <div style={{ height: 8, background: 'var(--card)', borderRadius: 999, overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ height: '100%', borderRadius: 999, background: progress === 100 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#2563eb,#60a5fa)', boxShadow: progress === 100 ? '0 0 12px rgba(245,158,11,0.5)' : '0 0 12px rgba(37,99,235,0.5)' }} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
            {progress === 100 ? '🎉 All parties have signed this document.' : `${totalCount - signedCount} more signature${totalCount - signedCount !== 1 ? 's' : ''} needed.`}
          </p>
        </div>

        {/* Certificate Banner (Shows when complete) */}
        {request.completed && (
          <div className="card-glass" style={{
            padding: '24px 28px',
            borderRadius: 22,
            marginBottom: 24,
            border: '1px solid rgba(245,158,11,0.3)',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.05), rgba(37,99,235,0.03))',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            boxShadow: '0 8px 32px rgba(245,158,11,0.05)'
          }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24', flexShrink: 0 }}>
                <Shield size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#fbbf24', marginBottom: 2 }}>Cryptographic Seal Ready</h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>This document is fully certified. Download your high-resolution printable cryptographic certificate of signature.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => downloadCertificate(request, nameMap)} className="btn"
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  fontSize: 14,
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #d97706, #fbbf24)',
                  boxShadow: '0 4px 18px rgba(245,158,11,0.25)',
                  color: '#0b0f19',
                  borderRadius: 12,
                  cursor: 'pointer',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}>
                🏆 Download Certificate
              </button>
              <button 
                onClick={async () => {
                  try {
                    const url = `${WALRUS_AGGREGATOR}/v1/blobs/${request.blobId}`;
                    const res = await fetch(url);
                    const blob = await res.blob();
                    const downloadUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = request.title;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(downloadUrl);
                  } catch (err) {
                    alert('Could not download directly.');
                  }
                }}
                className="btn"
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  fontSize: 14,
                  fontWeight: 700,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-1)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}>
                📥 Download Signed Document
              </button>
            </div>
          </div>
        )}

        {/* Interactive Document Preview */}
        <div className="card-glass" style={{ padding: 24, borderRadius: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} style={{ color: 'var(--accent-2)' }} /> Interactive Document Preview
          </h3>
          <div style={{ 
            width: '100%', 
            height: 480, 
            borderRadius: 12, 
            overflow: 'hidden', 
            background: '#0b0f19', 
            border: '1px solid var(--border)',
            position: 'relative',
            marginBottom: 16
          }}>
            <iframe 
              src={`${WALRUS_AGGREGATOR}/v1/blobs/${request.blobId}`} 
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Walrus Document Preview"
            />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href={`${WALRUS_AGGREGATOR}/v1/blobs/${request.blobId}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ExternalLink size={14} /> Open in New Tab
            </a>
            <button 
              onClick={async () => {
                try {
                  const url = `${WALRUS_AGGREGATOR}/v1/blobs/${request.blobId}`;
                  const res = await fetch(url);
                  const blob = await res.blob();
                  const downloadUrl = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = downloadUrl;
                  a.download = request.title;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(downloadUrl);
                } catch (err) {
                  alert('Could not download directly. Use Open in New Tab instead.');
                }
              }}
              className="btn" 
              style={{ 
                flex: 1, 
                justifyContent: 'center', 
                background: 'rgba(37,99,235,0.1)', 
                border: '1px solid rgba(37,99,235,0.2)', 
                color: 'var(--accent-2)',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              📥 Download Original File
            </button>
          </div>
        </div>

        {/* AI Co-Pilot Clause Auditor */}
        {(aiAuditing || aiReport) && (
          <div className="card-glass" style={{ padding: 24, borderRadius: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-2)' }}>
                <Shield size={16} />
              </div>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>AI Legal Co-Pilot Audit</h4>
                <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>Intelligent clause verification & compliance risk auditor</p>
              </div>
            </div>

            {aiAuditing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px', borderRadius: 16, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', justifyContent: 'center' }}>
                <Loader2 size={18} className="anim-spin" style={{ color: 'var(--accent-2)' }} />
                <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>Scanning document text & analyzing liability clauses...</span>
              </div>
            )}

            {aiReport && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Overview Panel */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderRadius: 16, background: aiReport.riskLevel === 'HIGH' ? 'rgba(239,68,68,0.08)' : aiReport.riskLevel === 'MEDIUM' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${aiReport.riskLevel === 'HIGH' ? 'rgba(239,68,68,0.2)' : aiReport.riskLevel === 'MEDIUM' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}` }}>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 2 }}>Risk Score</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: aiReport.riskLevel === 'HIGH' ? '#ef4444' : aiReport.riskLevel === 'MEDIUM' ? '#f59e0b' : '#10b981' }}>{aiReport.riskScore}/100</div>
                  </div>
                  <div style={{ height: 32, width: 1, background: 'var(--border)' }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{aiReport.docType}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: aiReport.riskLevel === 'HIGH' ? '#ef4444' : aiReport.riskLevel === 'MEDIUM' ? '#f59e0b' : '#10b981', color: '#0b0f19', textTransform: 'uppercase' }}>{aiReport.riskLevel} Risk</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>{aiReport.summary}</p>
                  </div>
                </div>

                {/* Audited Clauses */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Audited Clauses</div>
                  {aiReport.clauses.map((c, idx) => (
                    <div key={idx} style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>{c.title}</span>
                        <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, background: c.risk === 'danger' ? 'rgba(239,68,68,0.15)' : c.risk === 'warning' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: c.risk === 'danger' ? '#f87171' : c.risk === 'warning' ? '#fbbf24' : '#34d399' }}>{c.risk}</span>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', margin: '0 0 8px 0', paddingLeft: 8, borderLeft: '2px solid var(--border-2)' }}>"{c.foundText}"</p>
                      <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.4 }}>💡 {c.feedback}</p>
                    </div>
                  ))}
                </div>

                {/* Recommendations */}
                <div style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-2)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>🛡️ Co-Pilot Recommendations</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {aiReport.recommendations.map((rec, idx) => (
                      <li key={idx} style={{ lineHeight: 1.5 }}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Verification Explanation Panel */}
        <div style={{
          padding: '16px 20px', 
          background: 'rgba(255,255,255,0.02)', 
          border: '1px solid var(--border)', 
          borderRadius: 16, 
          marginBottom: 24 
        }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={14} style={{ color: 'var(--accent-2)' }} /> How do I verify this signed document?
          </h4>
          <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>
            Web3 digital signatures do not stamp or alter the original document (which would change the file content and corrupt it). 
            Instead, we record the document's unique, mathematical <strong>SHA-256 Hash</strong> on the Sui Blockchain alongside co-signers' cryptographic signatures.
            To verify any copy of the file:
          </p>
          <ol style={{ fontSize: 12, color: 'var(--text-3)', paddingLeft: 16, marginTop: 8, marginBottom: 0, lineHeight: 1.6 }}>
            <li>Open the <strong>Verify</strong> page of this application.</li>
            <li>Drag & drop the document file.</li>
            <li>The system will hash the file locally and match it with the blockchain record. If the hashes match, the document is 100% authentic and unaltered.</li>
          </ol>
        </div>

        {/* Message */}
        {request.message && (
          <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>Message from creator</div>
            <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65 }}>{request.message}</p>
          </div>
        )}

        {/* Signers */}
        <div className="card-glass" style={{ padding: 24, borderRadius: 20, marginBottom: 28 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Required Signers</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {request.requiredSigners.map((addr, i) => (
              <SignerRow key={i} address={addr} name={nameMap.get(addr) ?? null} hasSigned={request.signedBy.includes(addr)} />
            ))}
          </div>
        </div>

        {/* Cryptographic Audit Trail */}
        <div className="card-glass" style={{ padding: 24, borderRadius: 20, marginBottom: 28 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={16} style={{ color: 'var(--accent-2)' }} /> Cryptographic Audit Trail
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'relative', paddingLeft: 12 }}>
            {/* Line connector */}
            <div style={{ position: 'absolute', left: 19, top: 10, bottom: 10, width: 2, background: 'var(--border)' }} />

            {/* Step 1: Created */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#3b82f6', border: '3px solid #0b0f19', marginTop: 3 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Signing Request Created</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  On-chain record registered by {formatIdentity(request.creator, nameMap.get(request.creator))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, fontFamily: 'var(--mono)' }}>
                  {new Date(request.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Step 2: Storage */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#10b981', border: '3px solid #0b0f19', marginTop: 3 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Document Uploaded to Walrus</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  Encoded and stored on decentralized blob storage. Blob ID: <span style={{ fontFamily: 'var(--mono)', color: 'var(--accent-2)' }}>{request.blobId.slice(0, 8)}...{request.blobId.slice(-8)}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, fontFamily: 'var(--mono)' }}>
                  SHA-256: {request.documentHash.slice(0, 16)}...
                </div>
              </div>
            </div>

            {/* Step 3: Signatures */}
            {request.requiredSigners.map((signer, idx) => {
              const isSigned = request.signedBy.includes(signer);
              return (
                <div key={idx} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: isSigned ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                    border: `3px solid #0b0f19`, marginTop: 3
                  }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: isSigned ? 'var(--text-1)' : 'var(--text-3)' }}>
                      {isSigned ? 'Signature Verified' : 'Awaiting Signature'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      Signer: {formatIdentity(signer, nameMap.get(signer))}
                    </div>
                    {isSigned && (
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, fontFamily: 'var(--mono)' }}>
                        Status: Cryptographically Certified
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Step 4: Fully Certified (If completed) */}
            {request.completed && (
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fbbf24', border: '3px solid #0b0f19', marginTop: 3, boxShadow: '0 0 8px #fbbf24' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#fbbf24' }}>Document Fully Certified & Sealed</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    All required signatures present. Cryptographic seal anchored permanently on the Sui Mainnet.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Verification link */}
        <div style={{ padding: '12px 16px', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 12, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={16} style={{ color: 'var(--accent-2)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
            Public verification: <a href={`/verify/${request.blobId}`} style={{ color: 'var(--accent-2)', textDecoration: 'none', fontWeight: 600 }}>/verify/{request.blobId.slice(0, 16)}...</a>
          </span>
        </div>

        {/* Error */}
        {error && <div className="alert-error" style={{ marginBottom: 20 }}><AlertCircle size={16} style={{ verticalAlign: 'middle' }} /> {error}</div>}

        {/* Signed success */}
        {signedTx && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="alert-success" style={{ marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
            <CheckCircle2 size={16} /> Signed! Tx: <a href={`https://suiscan.xyz/mainnet/tx/${signedTx}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--success)', fontFamily: 'var(--mono)', fontSize: 12 }}>{signedTx.slice(0, 20)}...</a>
          </motion.div>
        )}

        {/* Sign button */}
        {!account && (
          <div className="card-glass" style={{ padding: 20, borderRadius: 16, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Connect your Sui wallet to sign this document.</p>
          </div>
        )}
        {account && !isRequiredSigner && (
          <div style={{ padding: '14px 18px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
            Your wallet is not listed as a required signer for this document.
          </div>
        )}
        {account && isRequiredSigner && !hasSigned && status === 'pending' && (
          <button className="btn btn-primary" onClick={handleSign} disabled={signing}
            style={{ width: '100%', justifyContent: 'center', fontSize: 17, padding: '18px', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', boxShadow: '0 8px 32px rgba(37,99,235,0.4)', borderRadius: 16 }}>
            {signing ? <><Loader2 size={18} className="anim-spin" /> Signing on Sui...</> : <>✍️ Sign This Document</>}
          </button>
        )}
        {account && hasSigned && (
          <div style={{ padding: '16px 20px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 16, textAlign: 'center', color: '#f59e0b', fontWeight: 600, fontSize: 15 }}>
            <CheckCircle2 size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} /> You have signed this document.
          </div>
        )}
      </motion.div>
    </main>
  );
}
