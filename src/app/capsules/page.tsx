'use client';

/**
 * WalSign 3.0 — Proof Capsules Page
 *
 * The crown jewel feature: Proof Capsules are immutable bundles of
 * files, AI outputs, approvals, timestamps, and memory lineage —
 * stored permanently on Walrus, verified on Sui.
 *
 * Think: Git commits, but for trust and authenticity.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Shield, Plus, Search, Filter, ChevronRight, ExternalLink,
  Hash, Clock, Users, Brain, CheckCircle2, GitBranch,
  Database, Lock, Zap, Eye, AlertCircle, Cpu, FileText,
  ArrowRight, Layers, X
} from 'lucide-react';
import {
  generateMockCapsules, getCapsuleTypeConfig, getCapsuleStatusConfig,
  formatBytes, type ProofCapsule, type CapsuleType, type CapsuleStatus
} from '@/lib/capsules';

/* ── Motion variants ─────────────────────────────────────────────────── */
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } };
const stagger = { show: { transition: { staggerChildren: 0.07 } } };

/* ── Agent Verified Badge ────────────────────────────────────────────── */
function AgentVerifiedBadge({ modelId, compact = false }: { modelId?: string; compact?: boolean }) {
  if (!modelId) return null;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: compact ? 4 : 6,
      padding: compact ? '2px 7px' : '4px 10px',
      borderRadius: 999,
      background: 'rgba(124,58,237,0.12)',
      border: '1px solid rgba(124,58,237,0.25)',
      fontSize: compact ? 9 : 11, fontWeight: 700, letterSpacing: '0.04em',
      color: 'var(--accent-2)', textTransform: 'uppercase',
    }}>
      <Cpu size={compact ? 8 : 10} />
      Agent Verified
    </div>
  );
}

/* ── Status Badge ────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: CapsuleStatus }) {
  const cfg = getCapsuleStatusConfig(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 999, fontSize: 10, fontWeight: 800,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />
      {cfg.label}
    </span>
  );
}

/* ── Proof Capsule Card ──────────────────────────────────────────────── */
function CapsuleCard({ capsule, onClick }: { capsule: ProofCapsule; onClick: () => void }) {
  const typeCfg = getCapsuleTypeConfig(capsule.type);
  const signedCount = capsule.signers.filter(s => s.signedAt).length;
  const totalCount = capsule.signers.length;
  const progress = totalCount > 0 ? (signedCount / totalCount) * 100 : 0;
  const timeAgo = getTimeAgo(capsule.createdAt);

  return (
    <motion.div
      variants={fadeUp}
      onClick={onClick}
      className="artifact-card"
      style={{ padding: '24px 26px', cursor: 'pointer' }}
      whileHover={{ scale: 1.005 }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Type icon */}
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: typeCfg.bg, border: `1px solid ${typeCfg.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>
            {typeCfg.icon}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-1)' }}>
                {capsule.title}
              </span>
              {capsule.aiGenerated && <AgentVerifiedBadge modelId={capsule.modelId} compact />}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: typeCfg.color }}>{typeCfg.label}</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>·</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={9} /> {timeAgo}
              </span>
            </div>
          </div>
        </div>
        <StatusBadge status={capsule.status} />
      </div>

      {/* Proof hash */}
      <div className="proof-pill" style={{ fontSize: 10, marginBottom: 16, width: 'fit-content', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <Hash size={10} style={{ color: 'var(--accent-3)', flexShrink: 0 }} />
        {capsule.sha256Hash.slice(0, 20)}...{capsule.sha256Hash.slice(-8)}
      </div>

      {/* Signer progress */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-3)', marginBottom: 5 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={9} /> Approvals
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: capsule.status === 'sealed' ? 'var(--accent-2)' : 'var(--verify-2)' }}>
            {signedCount}/{totalCount}
          </span>
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              height: '100%', borderRadius: 999,
              background: capsule.status === 'sealed' || capsule.status === 'verified'
                ? 'linear-gradient(90deg, #7c3aed, #a78bfa)'
                : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
              boxShadow: `0 0 8px ${capsule.status === 'sealed' || capsule.status === 'verified' ? 'rgba(124,58,237,0.5)' : 'rgba(245,158,11,0.5)'}`,
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {capsule.tags.slice(0, 2).map(tag => (
            <span key={tag} style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {tag}
            </span>
          ))}
          {capsule.blobSize && (
            <span style={{ fontSize: 9, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Database size={8} /> {formatBytes(capsule.blobSize)}
            </span>
          )}
        </div>
        <ChevronRight size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
      </div>
    </motion.div>
  );
}

/* ── Capsule Detail Modal ────────────────────────────────────────────── */
function CapsuleDetailModal({ capsule, onClose }: { capsule: ProofCapsule; onClose: () => void }) {
  const typeCfg = getCapsuleTypeConfig(capsule.type);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'lineage'>('overview');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(3, 5, 8, 0.90)',
          backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: '100%', maxWidth: 760,
            maxHeight: '88vh', overflowY: 'auto',
            background: 'rgba(7, 12, 26, 0.98)',
            border: '1px solid rgba(124, 58, 237, 0.25)',
            borderRadius: 28,
            boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,58,237,0.1)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div style={{ padding: '28px 32px 0', borderBottom: '1px solid var(--border)', paddingBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, fontSize: 24,
                  background: typeCfg.bg, border: `1px solid ${typeCfg.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {typeCfg.icon}
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 6 }}>{capsule.title}</h2>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <StatusBadge status={capsule.status} />
                    {capsule.aiGenerated && <AgentVerifiedBadge modelId={capsule.modelId} />}
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{typeCfg.label}</span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--text-2)', display: 'flex' }}>
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2 }}>
              {(['overview', 'timeline', 'lineage'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: activeTab === tab ? 700 : 500, textTransform: 'capitalize',
                  background: activeTab === tab ? 'rgba(124,58,237,0.15)' : 'transparent',
                  color: activeTab === tab ? 'var(--accent-2)' : 'var(--text-3)',
                  transition: 'all 0.2s',
                }}>
                  {tab === 'lineage' ? 'Memory Lineage' : tab}
                </button>
              ))}
            </div>
          </div>

          {/* Modal Body */}
          <div style={{ padding: '28px 32px 32px' }}>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Cryptographic proof */}
                <div style={{ padding: '20px 22px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-2)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>Cryptographic Proof</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'SHA-256 Hash', value: capsule.sha256Hash, mono: true },
                      { label: 'Walrus Blob ID', value: capsule.blobId, mono: true },
                      { label: 'Sui Object ID', value: capsule.objectId ?? 'Pending', mono: true },
                      { label: 'Anchored At', value: capsule.anchoredAt ? new Date(capsule.anchoredAt).toISOString() : '—', mono: false },
                    ].map(({ label, value, mono }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0, width: 110 }}>{label}</span>
                        <span style={{ fontSize: 11, fontFamily: mono ? 'var(--mono)' : undefined, color: 'var(--accent-3)', wordBreak: 'break-all', textAlign: 'right' }}>
                          {value && value.length > 48 ? `${value.slice(0, 28)}…${value.slice(-8)}` : value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Signers */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>Approval Chain</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {capsule.signers.map((signer, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '14px 16px', borderRadius: 12,
                        background: signer.signedAt ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${signer.signedAt ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                          background: signer.role === 'ai-agent' ? 'rgba(124,58,237,0.15)' : 'rgba(16,185,129,0.1)',
                          border: `1px solid ${signer.role === 'ai-agent' ? 'rgba(124,58,237,0.3)' : 'rgba(16,185,129,0.25)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14,
                        }}>
                          {signer.role === 'ai-agent' ? '🤖' : '👤'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, fontWeight: 700 }}>
                              {signer.name ?? (signer.agentId ? signer.agentId : `${signer.address.slice(0, 8)}…`)}
                            </span>
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase',
                              background: signer.role === 'ai-agent' ? 'rgba(124,58,237,0.15)' : 'rgba(16,185,129,0.1)',
                              color: signer.role === 'ai-agent' ? 'var(--accent-2)' : 'var(--verify-2)',
                              border: `1px solid ${signer.role === 'ai-agent' ? 'rgba(124,58,237,0.25)' : 'rgba(16,185,129,0.2)'}`,
                            }}>
                              {signer.role}
                            </span>
                            {signer.signedAt && (
                              <span style={{ fontSize: 9, color: 'var(--verify-2)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                <CheckCircle2 size={9} /> Signed
                              </span>
                            )}
                          </div>
                          {signer.reasoning && (
                            <p style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.55, margin: 0, fontStyle: 'italic' }}>
                              "{signer.reasoning}"
                            </p>
                          )}
                          {signer.signedAt && (
                            <span style={{ fontSize: 10, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                              <Clock size={9} /> {new Date(signer.signedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    <Eye size={14} /> Verify Publicly
                  </button>
                  <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                    <ExternalLink size={14} /> Open on Walrus
                  </button>
                </div>
              </div>
            )}

            {/* TIMELINE TAB */}
            {activeTab === 'timeline' && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 20 }}>Proof Timeline</div>
                <div style={{ position: 'relative' }}>
                  {/* Vertical line */}
                  <div style={{ position: 'absolute', left: 15, top: 16, bottom: 0, width: 1, background: 'linear-gradient(180deg, rgba(124,58,237,0.4), transparent)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {capsule.events.map((event, i) => {
                      const eventColors: Record<string, string> = {
                        created: '#a78bfa', anchored: '#67e8f9', signed: '#34d399',
                        'agent-signed': '#a78bfa', verified: '#34d399', sealed: '#fbbf24', contested: '#f87171',
                      };
                      const color = eventColors[event.type] ?? '#94a3b8';
                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08, duration: 0.4 }}
                          style={{ display: 'flex', gap: 16, paddingBottom: i < capsule.events.length - 1 ? 20 : 0 }}
                        >
                          {/* Dot */}
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                            background: `${color}15`, border: `1.5px solid ${color}50`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 0 10px ${color}30`,
                            fontSize: 12,
                          }}>
                            {event.type === 'created' ? '📄' : event.type === 'anchored' ? '⚓' : event.type === 'agent-signed' ? '🤖' : event.type === 'signed' ? '✍️' : event.type === 'sealed' ? '🔒' : '✅'}
                          </div>
                          <div style={{ paddingTop: 4 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginBottom: 3 }}>{event.description}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                              <span>{new Date(event.timestamp).toLocaleString()}</span>
                              {event.txDigest && (
                                <span style={{ fontFamily: 'var(--mono)', color: 'var(--accent-3)' }}>
                                  tx: {event.txDigest.slice(0, 14)}…
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* MEMORY LINEAGE TAB */}
            {activeTab === 'lineage' && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>AI Memory Lineage</div>
                {capsule.memoryLineage ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 8 }}>
                      The following sources were used to generate this AI artifact. This lineage is cryptographically attached to the capsule.
                    </p>
                    {capsule.memoryLineage.map((node, i) => (
                      <motion.div
                        key={node.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        style={{
                          padding: '14px 16px', borderRadius: 12,
                          background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.12)',
                          display: 'flex', gap: 14, alignItems: 'flex-start',
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16,
                        }}>
                          {node.type === 'file' ? '📄' : node.type === 'model' ? '🤖' : node.type === 'prompt' ? '💬' : node.type === 'dataset' ? '🗄️' : '🔗'}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{node.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }}>{node.description}</div>
                          {node.blobId && (
                            <div className="proof-pill" style={{ fontSize: 9, marginTop: 8, width: 'fit-content' }}>
                              <Database size={8} /> {node.blobId.slice(0, 20)}…
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
                    <Brain size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <p style={{ fontSize: 13 }}>No AI memory lineage for this artifact.<br />Memory lineage is available for AI-generated capsules.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Utility ─────────────────────────────────────────────────────────── */
function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'Just now';
}

/* ── Main Page ───────────────────────────────────────────────────────── */
const ALL_CAPSULES = generateMockCapsules(12);
const TYPE_FILTERS: { label: string; value: CapsuleType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'AI Output', value: 'ai-output' },
  { label: 'Legal', value: 'legal-agreement' },
  { label: 'Governance', value: 'governance' },
  { label: 'Creative', value: 'creative' },
  { label: 'Evidence', value: 'evidence' },
  { label: 'Developer', value: 'developer' },
];

export default function CapsulesPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<CapsuleType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<CapsuleStatus | 'all'>('all');
  const [selectedCapsule, setSelectedCapsule] = useState<ProofCapsule | null>(null);

  const filtered = useMemo(() => {
    return ALL_CAPSULES.filter(c => {
      const matchesSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.type.includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || c.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [search, typeFilter, statusFilter]);

  const stats = {
    total: ALL_CAPSULES.length,
    sealed: ALL_CAPSULES.filter(c => c.status === 'sealed').length,
    verified: ALL_CAPSULES.filter(c => c.status === 'verified').length,
    aiGenerated: ALL_CAPSULES.filter(c => c.aiGenerated).length,
  };

  return (
    <>
      <main style={{ minHeight: '100vh', padding: '100px 24px 80px', maxWidth: 1060, margin: '0 auto' }}>
        <motion.div initial="hidden" animate="show" variants={stagger}>

          {/* ── Header ──────────────────────────────────────────── */}
          <motion.div variants={fadeUp} style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div className="trust-badge trust-badge-violet" style={{ marginBottom: 16, display: 'inline-flex' }}>
                  <Lock size={10} /> Proof Capsules
                </div>
                <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 10, lineHeight: 1.1 }}>
                  Immutable proof bundles.
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text-2)', maxWidth: 520, lineHeight: 1.65 }}>
                  Proof Capsules seal artifacts, AI outputs, and approvals into permanent cryptographic bundles — stored on Walrus, verified on Sui.
                </p>
              </div>
              <Link href="/create" className="btn btn-primary" style={{ boxShadow: '0 4px 20px rgba(124,58,237,0.4)', flexShrink: 0 }}>
                <Plus size={15} /> New Capsule
              </Link>
            </div>
          </motion.div>

          {/* ── Stats Strip ─────────────────────────────────────── */}
          <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 32 }}>
            {[
              { label: 'Total Capsules', value: stats.total, color: 'var(--accent-2)', icon: <Layers size={14} /> },
              { label: 'Sealed', value: stats.sealed, color: 'var(--accent-2)', icon: <Lock size={14} /> },
              { label: 'Verified', value: stats.verified, color: 'var(--verify-2)', icon: <CheckCircle2 size={14} /> },
              { label: 'AI Generated', value: stats.aiGenerated, color: 'var(--accent-2)', icon: <Cpu size={14} /> },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '16px 20px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
                display: 'flex', gap: 12, alignItems: 'center',
              }}>
                <div style={{ color: s.color, opacity: 0.7 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: s.color, fontFamily: 'var(--mono)', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* ── Filters ─────────────────────────────────────────── */}
          <motion.div variants={fadeUp} style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
              <input
                className="input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search capsules..."
                style={{ paddingLeft: 36, fontSize: 13, height: 38 }}
              />
            </div>

            {/* Type filter */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TYPE_FILTERS.map(f => (
                <button key={f.value} onClick={() => setTypeFilter(f.value)}
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: typeFilter === f.value ? 700 : 500,
                    background: typeFilter === f.value ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)',
                    color: typeFilter === f.value ? 'var(--accent-2)' : 'var(--text-2)',
                    border: `1px solid ${typeFilter === f.value ? 'rgba(124,58,237,0.25)' : 'var(--border)'}`,
                    transition: 'all 0.15s',
                  }}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as CapsuleStatus | 'all')}
              className="select"
              style={{ fontSize: 12, height: 38, width: 'auto', paddingRight: 28, paddingLeft: 10 }}
            >
              <option value="all">All Status</option>
              <option value="sealed">Sealed</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="contested">Contested</option>
            </select>
          </motion.div>

          {/* ── Capsule Grid ────────────────────────────────────── */}
          <motion.div
            variants={stagger}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}
          >
            {filtered.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '64px 24px', color: 'var(--text-3)' }}>
                <Lock size={36} style={{ margin: '0 auto 16px', opacity: 0.25 }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>No capsules found</h3>
                <p style={{ fontSize: 13 }}>Try a different filter or create your first Proof Capsule.</p>
              </div>
            ) : (
              filtered.map(capsule => (
                <CapsuleCard
                  key={capsule.id}
                  capsule={capsule}
                  onClick={() => setSelectedCapsule(capsule)}
                />
              ))
            )}
          </motion.div>

          {/* ── Explainer Section ───────────────────────────────── */}
          <motion.div variants={fadeUp} style={{ marginTop: 64 }}>
            <div className="artifact-card" style={{ padding: '40px 44px' }}>
              <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div className="trust-badge trust-badge-violet" style={{ marginBottom: 16, display: 'inline-flex' }}>
                    <GitBranch size={10} /> Protocol
                  </div>
                  <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 12, lineHeight: 1.2 }}>
                    What is a Proof Capsule?
                  </h2>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.75 }}>
                    A Proof Capsule is an immutable cryptographic bundle that permanently captures an artifact and its entire context — who created it, who approved it, when it was anchored, and how it was generated. Think Git commits, but for trust.
                  </p>
                </div>
                <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { icon: '📄', label: 'Artifact', desc: 'Files, documents, AI outputs, code' },
                    { icon: '⚓', label: 'Anchor', desc: 'SHA-256 hash on Sui blockchain' },
                    { icon: '🤖', label: 'Agent Signature', desc: 'AI reasoning attached to output' },
                    { icon: '🔒', label: 'Seal', desc: 'Permanent immutable record on Walrus' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                        {item.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

        </motion.div>
      </main>

      {/* ── Detail Modal ────────────────────────────────────────── */}
      {selectedCapsule && (
        <CapsuleDetailModal
          capsule={selectedCapsule}
          onClose={() => setSelectedCapsule(null)}
        />
      )}
    </>
  );
}
