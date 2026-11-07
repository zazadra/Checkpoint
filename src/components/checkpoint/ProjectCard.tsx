'use client';

import { motion } from 'framer-motion';
import type { Project, CheckpointEntry } from '@/lib/checkpoint-types';

const COLOR_MAP: Record<string, { accent: string; glow: string; badge: string }> = {
  violet: { accent: '#7c3aed', glow: 'rgba(124,58,237,0.25)', badge: 'rgba(124,58,237,0.12)' },
  cyan:   { accent: '#06b6d4', glow: 'rgba(6,182,212,0.25)',   badge: 'rgba(6,182,212,0.12)'  },
  emerald:{ accent: '#10b981', glow: 'rgba(16,185,129,0.25)',  badge: 'rgba(16,185,129,0.12)' },
  amber:  { accent: '#f59e0b', glow: 'rgba(245,158,11,0.25)',  badge: 'rgba(245,158,11,0.12)' },
  rose:   { accent: '#f43f5e', glow: 'rgba(244,63,94,0.25)',   badge: 'rgba(244,63,94,0.12)'  },
  indigo: { accent: '#6366f1', glow: 'rgba(99,102,241,0.25)',  badge: 'rgba(99,102,241,0.12)' },
};

const MOOD_ICON: Record<string, string> = {
  great: '🚀', good: '✅', meh: '😐', stuck: '🧩', blocked: '🚧',
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

interface ProjectCardProps {
  project: Project;
  checkpointCount: number;
  lastCheckpoint: CheckpointEntry | null;
  index: number;
  onClick: () => void;
}

export function ProjectCard({
  project, checkpointCount, lastCheckpoint, index, onClick
}: ProjectCardProps) {
  const c = COLOR_MAP[project.color] ?? COLOR_MAP.violet;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        background: 'var(--card)',
        border: `1px solid ${c.glow}`,
        borderRadius: 18,
        padding: '20px 20px 16px',
        cursor: 'pointer',
        boxShadow: `0 0 24px ${c.glow}, var(--shadow-md)`,
        transition: 'box-shadow 0.2s',
      }}
    >
      {/* Top: color dot + project name */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: c.accent,
          boxShadow: `0 0 10px ${c.accent}`,
          marginTop: 5, flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontSize: 16, fontWeight: 700, color: 'var(--text-1)',
            lineHeight: 1.3, marginBottom: 4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {project.name}
          </h3>
          {project.description && (
            <p style={{
              fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4,
              overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {project.description}
            </p>
          )}
        </div>
      </div>

      {/* Last checkpoint preview */}
      {lastCheckpoint ? (
        <div style={{
          background: c.badge,
          border: `1px solid ${c.glow}`,
          borderRadius: 10,
          padding: '8px 10px',
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 12 }}>{MOOD_ICON[lastCheckpoint.mood]}</span>
            <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
              {timeAgo(lastCheckpoint.createdAt)}
            </span>
          </div>
          <p style={{
            fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4,
            overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {lastCheckpoint.currentWork}
          </p>
        </div>
      ) : (
        <div style={{
          border: '1px dashed rgba(255,255,255,0.08)',
          borderRadius: 10, padding: '10px',
          marginBottom: 12, textAlign: 'center',
        }}>
          <p style={{ fontSize: 11, color: 'var(--text-3)' }}>No checkpoints yet</p>
        </div>
      )}

      {/* Footer: checkpoint count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 11, fontWeight: 600, color: c.accent,
          background: c.badge,
          padding: '2px 8px', borderRadius: 6,
        }}>
          {checkpointCount} checkpoint{checkpointCount !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>→</span>
      </div>
    </motion.button>
  );
}
