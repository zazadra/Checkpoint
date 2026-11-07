'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { Project } from '@/lib/checkpoint-types';
import { useCheckpoints, useProjectInsights } from '@/hooks/useCheckpoints';
import { CheckpointCard } from './CheckpointCard';
import { CheckpointForm } from './CheckpointForm';
import { InsightBanner } from './InsightBanner';

const COLOR_ACCENT: Record<string, string> = {
  violet: '#7c3aed', cyan: '#06b6d4', emerald: '#10b981',
  amber: '#f59e0b', rose: '#f43f5e', indigo: '#6366f1',
};

interface Props {
  project: Project;
  onBack: () => void;
}

export function ProjectDetail({ project, onBack }: Props) {
  const { checkpoints, saving, addCheckpoint } = useCheckpoints();
  const insights = useProjectInsights(project.id);
  const accent = COLOR_ACCENT[project.color] ?? '#7c3aed';

  const projectCheckpoints = checkpoints
    .filter((c) => c.projectId === project.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  const handleSave = async (entry: Parameters<typeof addCheckpoint>[0]) => {
    await addCheckpoint(entry);
  };

  return (
    <div style={{ minHeight: '100dvh', padding: '76px 16px 48px', maxWidth: 1000, margin: '0 auto' }}>
      {/* ── Back + Title ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 28 }}
      >
        <button
          className="btn btn-ghost btn-sm"
          onClick={onBack}
          style={{ marginBottom: 16, paddingLeft: 0, color: 'var(--text-2)' }}
        >
          ← Back to projects
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 12, height: 12, borderRadius: '50%',
            background: accent, boxShadow: `0 0 12px ${accent}`,
            flexShrink: 0,
          }} />
          <h1 style={{
            fontSize: 26, fontWeight: 800, fontFamily: 'var(--heading)',
            color: 'var(--text-1)', lineHeight: 1.2,
          }}>
            {project.name}
          </h1>
        </div>
        {project.description && (
          <p style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 6, marginLeft: 24 }}>
            {project.description}
          </p>
        )}
      </motion.div>

      {/* ── Two-column layout ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 340px',
        gap: 20,
        alignItems: 'start',
      }}
        className="mobile-grid-stack"
      >

        {/* ── Left: history ── */}
        <div>
          {/* Insight banner */}
          {insights && insights.totalCheckpoints > 0 && (
            <InsightBanner insight={insights} />
          )}

          {/* Recall header */}
          {projectCheckpoints.length > 0 && (
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
                Session history
              </span>
              <span style={{
                fontSize: 11, color: accent,
                background: `rgba(124,58,237,0.1)`,
                border: `1px solid rgba(124,58,237,0.2)`,
                borderRadius: 6, padding: '1px 7px', fontWeight: 600,
              }}>
                {projectCheckpoints.length}
              </span>
            </div>
          )}

          {/* Empty state */}
          {projectCheckpoints.length === 0 && (
            <div style={{
              border: '1px dashed rgba(255,255,255,0.08)',
              borderRadius: 14, padding: '40px 24px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📝</div>
              <p style={{ color: 'var(--text-3)', fontSize: 14 }}>
                No checkpoints yet. Log your first session →
              </p>
            </div>
          )}

          {/* Checkpoint list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AnimatePresence>
              {projectCheckpoints.map((entry, i) => (
                <CheckpointCard
                  key={entry.id}
                  entry={entry}
                  isLatest={i === 0}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Right: form (sticky) ── */}
        <div style={{ position: 'sticky', top: 76 }}>
          <div style={{
            background: 'var(--card)',
            border: `1px solid ${accent}33`,
            borderRadius: 16,
            padding: '20px',
            boxShadow: `0 0 32px ${accent}18`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 16 }}>⚡</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>
                Log this session
              </span>
            </div>

            {/* "Resuming from…" prompt if there's a last checkpoint */}
            {projectCheckpoints[0] && (
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 12px', marginBottom: 14,
              }}>
                <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
                  Last session, you were working on:
                </p>
                <p style={{
                  fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {projectCheckpoints[0].currentWork}
                </p>
                {projectCheckpoints[0].nextSteps && (
                  <p style={{ fontSize: 11, color: accent, marginTop: 4 }}>
                    → {projectCheckpoints[0].nextSteps}
                  </p>
                )}
              </div>
            )}

            <CheckpointForm
              projectId={project.id}
              saving={saving}
              memoryCount={checkpoints.length}
              onSave={handleSave}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
