'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CheckpointEntry } from '@/lib/checkpoint-types';

const MOOD_ICON: Record<string, string> = {
  great: '🚀', good: '✅', meh: '😐', stuck: '🧩', blocked: '🚧',
};
const MOOD_COLOR: Record<string, string> = {
  great: '#10b981', good: '#06b6d4', meh: '#94a3b8', stuck: '#f59e0b', blocked: '#f43f5e',
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor(diff / 60_000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

interface Props {
  entry: CheckpointEntry;
  isLatest?: boolean;
}

export function CheckpointCard({ entry, isLatest }: Props) {
  const [expanded, setExpanded] = useState(isLatest ?? false);
  const moodColor = MOOD_COLOR[entry.mood] ?? '#94a3b8';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--card)',
        border: `1px solid ${isLatest ? `rgba(16,185,129,0.3)` : 'var(--border)'}`,
        borderRadius: 14,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Latest badge */}
      {isLatest && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: '#10b981',
          background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: 6, padding: '2px 7px',
        }}>
          Latest
        </div>
      )}

      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none',
          cursor: 'pointer', padding: '14px 16px',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}
      >
        {/* Mood icon */}
        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>
          {MOOD_ICON[entry.mood]}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Time and Verification */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: moodColor, fontWeight: 600 }}>
              {entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1)}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>·</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }} title={formatDate(entry.createdAt)}>
              {timeAgo(entry.createdAt)}
            </span>
            {entry.signature && (
              <>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>·</span>
                <span style={{
                  fontSize: 10,
                  color: '#a78bfa',
                  background: 'rgba(124, 58, 237, 0.15)',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  borderRadius: 4,
                  padding: '1px 5px',
                  fontWeight: 600,
                }} title={`Sui Wallet Signature: ${entry.signature}`}>
                  🔒 Verified Signature
                </span>
              </>
            )}
          </div>

          {/* currentWork — always visible */}
          <p style={{
            fontSize: 13, color: 'var(--text-1)', lineHeight: 1.45,
            overflow: 'hidden', textOverflow: 'ellipsis',
            display: expanded ? 'block' : '-webkit-box',
            WebkitLineClamp: expanded ? undefined : 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {entry.currentWork}
          </p>
        </div>

        {/* Expand chevron */}
        <span style={{
          color: 'var(--text-3)', fontSize: 12, flexShrink: 0,
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
          marginTop: 2,
        }}>
          ▾
        </span>
      </button>

      {/* Expandable detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '0 16px 14px 44px',
              display: 'flex', flexDirection: 'column', gap: 10,
              borderTop: '1px solid var(--border)',
              paddingTop: 12,
            }}>
              {entry.blockers && (
                <Detail icon="🚧" label="Blockers" value={entry.blockers} color="#f59e0b" />
              )}
              {entry.decisions && (
                <Detail icon="✍️" label="Decisions" value={entry.decisions} color="#06b6d4" />
              )}
              {entry.nextSteps && (
                <Detail icon="⏭" label="Next move" value={entry.nextSteps} color="#a78bfa" />
              )}

              {/* Memory reference */}
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>
                🔗 Walrus Memory · {entry.walrusOwner.slice(0, 6)}…{entry.walrusOwner.slice(-4)} ·{' '}
                {formatDate(entry.createdAt)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Detail({ icon, label, value, color }: {
  icon: string; label: string; value: string; color: string;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
        <span style={{ fontSize: 12 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, margin: 0 }}>
        {value}
      </p>
    </div>
  );
}
