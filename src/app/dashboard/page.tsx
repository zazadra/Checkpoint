'use client';

import { useEffect, useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { motion } from 'framer-motion';
import { FileText, Clock, CheckCircle2, AlertCircle, Loader2, Plus, ExternalLink, User } from 'lucide-react';
import Link from 'next/link';
import { fetchAllSigningRequests } from '@/lib/tatum';
import { resolveAddressesToNames, formatIdentity } from '@/lib/suins';
import { parseSuiSigningRequest } from '@/lib/walsign';
import { getRequestStatus } from '@/types/walsign';
import type { SigningRequest } from '@/types/walsign';

function StatusBadge({ status }: { status: ReturnType<typeof getRequestStatus> }) {
  const cfg = {
    pending:   { label: 'Pending',   color: '#60a5fa', bg: 'rgba(37,99,235,0.1)',   border: 'rgba(37,99,235,0.2)' },
    completed: { label: 'Completed', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
    revoked:   { label: 'Revoked',   color: '#f87171', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)' },
  }[status];
  return (
    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {cfg.label}
    </span>
  );
}

function RequestCard({ req, nameMap, currentAddress }: { req: SigningRequest; nameMap: Map<string, string | null>; currentAddress: string }) {
  const status = getRequestStatus(req);
  const signed = req.signedBy.length;
  const total = req.requiredSigners.length;
  const isMySig = req.requiredSigners.includes(currentAddress);
  const hasSigned = req.signedBy.includes(currentAddress);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ padding: '20px 22px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, transition: 'border-color 0.2s, transform 0.2s' }}
      whileHover={{ borderColor: 'var(--border-2)', y: -2 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileText size={18} style={{ color: 'var(--accent-2)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.title}</span>
            <StatusBadge status={status} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span><Clock size={10} style={{ verticalAlign: 'middle' }} /> {new Date(req.createdAt).toLocaleDateString()}</span>
            <span><User size={10} style={{ verticalAlign: 'middle' }} /> {formatIdentity(req.creator, nameMap.get(req.creator))}</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 5 }}>
          <span>Signatures</span>
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: status === 'completed' ? '#f59e0b' : 'var(--accent-2)' }}>{signed}/{total}</span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${total > 0 ? (signed / total) * 100 : 0}%`, borderRadius: 999, background: status === 'completed' ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#2563eb,#60a5fa)', transition: 'width 0.5s' }} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link href={`/sign/${req.objectId}`} className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center', minWidth: 100 }}>
          View Request
        </Link>
        {isMySig && !hasSigned && status === 'pending' && (
          <Link href={`/sign/${req.objectId}`} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', minWidth: 100 }}>
            ✍️ Sign Now
          </Link>
        )}
        {req.blobId && (
          <Link href={`/verify/${req.blobId}`} target="_blank" className="btn btn-ghost btn-sm" style={{ justifyContent: 'center' }} title="Verify document">
            <ExternalLink size={13} />
          </Link>
        )}
      </div>
    </motion.div>
  );
}

type TabType = 'sent' | 'inbox' | 'completed';

export default function DashboardPage() {
  const account = useCurrentAccount();
  const [tab, setTab] = useState<TabType>('sent');
  const [sentRequests, setSentRequests] = useState<SigningRequest[]>([]);
  const [inboxRequests, setInboxRequests] = useState<SigningRequest[]>([]);
  const [nameMap, setNameMap] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!account) return;
    setLoading(true);
    setError('');
    fetchAllSigningRequests()
      .then(async (rawObjects) => {
        const allParsed = rawObjects
          .map(parseSuiSigningRequest)
          .filter((r): r is SigningRequest => r !== null);

        const sent = allParsed.filter(r => r.creator === account.address);
        const inbox = allParsed.filter(r => r.requiredSigners.includes(account.address) && r.creator !== account.address);

        console.log('[Dashboard] sent:', sent.length, 'inbox:', inbox.length);
        setSentRequests(sent);
        setInboxRequests(inbox);

        // Collect all unique addresses for SuiNS resolution
        const allAddrs = new Set<string>();
        [...sent, ...inbox].forEach(r => {
          allAddrs.add(r.creator);
          r.requiredSigners.forEach(a => allAddrs.add(a));
        });
        const names = await resolveAddressesToNames([...allAddrs]);
        setNameMap(names);
      })
      .catch(e => {
        console.error('[Dashboard] load failed:', e);
        setError(e?.message ?? 'Failed to load requests');
      })
      .finally(() => setLoading(false));
  }, [account]);

  if (!account) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="card-glass" style={{ padding: '56px 48px', borderRadius: 28, textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🔐</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Connect Your Wallet</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6 }}>Connect your Sui wallet to view your signing requests.</p>
        </div>
      </div>
    );
  }

  // All completed requests (sent or received)
  const allRequests = [...sentRequests];
  // Add inbox requests that aren't already in sent
  inboxRequests.forEach(r => {
    if (!allRequests.find(s => s.objectId === r.objectId)) allRequests.push(r);
  });
  const completedRequests = allRequests.filter(r => getRequestStatus(r) === 'completed');

  const pendingInbox = inboxRequests.filter(r => getRequestStatus(r) === 'pending' && !r.signedBy.includes(account.address)).length;

  const currentList =
    tab === 'sent' ? sentRequests :
    tab === 'inbox' ? inboxRequests :
    completedRequests;

  return (
    <main style={{ minHeight: '100vh', padding: '100px 24px 80px', maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 4 }}>Dashboard</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Manage your signing requests on Sui</p>
        </div>
        <Link href="/create" className="btn btn-primary" style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', boxShadow: '0 4px 20px rgba(37,99,235,0.3)' }}>
          <Plus size={16} /> New Request
        </Link>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Sent',      value: sentRequests.length,  color: '#60a5fa' },
          { label: 'To Sign',   value: pendingInbox,          color: '#f59e0b' },
          { label: 'Completed', value: completedRequests.length, color: '#10b981' },
        ].map((s, i) => (
          <div key={i} style={{ padding: '16px 20px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: s.color, fontFamily: 'var(--mono)', lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '4px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 24, width: 'fit-content' }}>
        {([
          ['sent',      'Sent by Me'],
          ['inbox',     `Inbox${pendingInbox > 0 ? ` (${pendingInbox})` : ''}`],
          ['completed', `Completed${completedRequests.length > 0 ? ` (${completedRequests.length})` : ''}`],
        ] as [TabType, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 700 : 500, background: tab === t ? 'rgba(37,99,235,0.15)' : 'transparent', color: tab === t ? 'var(--accent-2)' : 'var(--text-2)', transition: 'all 0.2s' }}>
            {label}
          </button>
        ))}
      </div>

      {error && <div className="alert-error" style={{ marginBottom: 20 }}><AlertCircle size={16} style={{ verticalAlign: 'middle' }} /> {error}</div>}

      {loading && (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-2)' }}>
          <Loader2 size={28} className="anim-spin" style={{ margin: '0 auto 12px', color: 'var(--accent-2)' }} />
          <p>Loading from Sui...</p>
        </div>
      )}

      {!loading && currentList.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-3)' }}>
          <FileText size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: 'var(--text-2)' }}>
            {tab === 'sent' ? 'No requests sent yet' : tab === 'inbox' ? 'No pending requests' : 'No completed requests yet'}
          </h3>
          <p style={{ fontSize: 14, marginBottom: 24 }}>
            {tab === 'sent'
              ? 'Create your first signing request to get started.'
              : tab === 'inbox'
              ? 'You have no documents waiting for your signature.'
              : 'Completed requests will appear here once all signers have signed.'}
          </p>
          {tab === 'sent' && (
            <Link href="/create" className="btn btn-primary" style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)' }}>
              <Plus size={16} /> Create Request
            </Link>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {currentList.map((req, i) => (
          <RequestCard key={req.objectId ?? i} req={req} nameMap={nameMap} currentAddress={account.address} />
        ))}
      </div>
    </main>
  );
}
