'use client';

import { motion } from 'framer-motion';
import type { ProjectInsight, SessionMood } from '@/lib/checkpoint-types';

const MOOD_LABEL: Record<SessionMood, { icon: string; label: string; color: string }> = {
  great:   { icon: '🚀', label: 'Great flow',   color: '#10b981' },
  good:    { icon: '✅', label: 'Going well',   color: '#06b6d4' },
  meh:     { icon: '😐', label: 'So-so',        color: '#94a3b8' },
  stuck:   { icon: '🧩', label: 'Often stuck',  color: '#f59e0b' },
  blocked: { icon: '🚧', label: 'Frequently blocked', color: '#f43f5e' },
};

interface Props {
  insight: ProjectInsight;
}

export function InsightBanner({ insight }: Props) {
  if (insight.totalCheckpoints === 0) return null;

  const mood = MOOD_LABEL[insight.recentMoodTrend];
  const topBlocker = Object.entries(insight.blockerFrequency)
    .sort((a, b) => b[1] - a[1])[0];

  const staleDays = insight.daysSinceLastCheckpoint;
  const isStale = staleDays >= 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.06))',
        border: '1px solid rgba(124,58,237,0.2)',
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 20,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 13 }}>🧠</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Memory Insights
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)',
        }}>
          {insight.totalCheckpoints} session{insight.totalCheckpoints !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Recent mood */}
        <InsightRow
          icon={mood.icon}
          text={`Recent vibe: ${mood.label}`}
          color={mood.color}
        />

        {/* Stale warning */}
        {isStale && (
          <InsightRow
            icon="⏰"
            text={`${staleDays === 1 ? 'Yesterday' : `${staleDays} days ago`} was your last session — ready to continue?`}
            color="#f59e0b"
            highlight
          />
        )}

        {/* Recurring themes */}
        {insight.recurringThemes.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>🔁</span>
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Recurring themes: </span>
              <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                {insight.recurringThemes.map((t) => (
                  <span key={t} style={{
                    fontSize: 11, fontWeight: 600,
                    background: 'rgba(124,58,237,0.15)',
                    border: '1px solid rgba(124,58,237,0.25)',
                    color: '#c4b5fd', borderRadius: 6, padding: '1px 7px',
                  }}>
                    {t}
                  </span>
                ))}
              </span>
            </div>
          </div>
        )}

        {/* Top recurring blocker */}
        {topBlocker && topBlocker[1] >= 2 && (
          <InsightRow
            icon="🔁"
            text={`Came up ${topBlocker[1]}x: "${topBlocker[0]}"`}
            color="#f59e0b"
          />
        )}
      </div>
    </motion.div>
  );
}

function InsightRow({ icon, text, color, highlight }: {
  icon: string; text: string; color: string; highlight?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      ...(highlight ? {
        background: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.2)',
        borderRadius: 8, padding: '6px 8px',
      } : {}),
    }}>
      <span style={{ fontSize: 13, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 12, color: highlight ? color : 'var(--text-2)', lineHeight: 1.4 }}>
        {text}
      </span>
    </div>
  );
}
