'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { CheckpointEntry, SessionMood } from '@/lib/checkpoint-types';

const MOOD_OPTIONS: { value: SessionMood; icon: string; label: string; color: string }[] = [
  { value: 'great',   icon: '🚀', label: 'Great',   color: '#10b981' },
  { value: 'good',    icon: '✅', label: 'Good',    color: '#06b6d4' },
  { value: 'meh',     icon: '😐', label: 'Meh',     color: '#94a3b8' },
  { value: 'stuck',   icon: '🧩', label: 'Stuck',   color: '#f59e0b' },
  { value: 'blocked', icon: '🚧', label: 'Blocked', color: '#f43f5e' },
];

interface Props {
  projectId: string;
  saving: boolean;
  memoryCount: number;
  onSave: (entry: Omit<CheckpointEntry, 'id' | 'walrusOwner' | 'blobId'>) => Promise<void>;
}

export function CheckpointForm({ projectId, saving, memoryCount, onSave }: Props) {
  const [currentWork, setCurrentWork] = useState('');
  const [blockers, setBlockers] = useState('');
  const [decisions, setDecisions] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [mood, setMood] = useState<SessionMood>('good');
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWork.trim()) return;
    await onSave({
      projectId,
      currentWork: currentWork.trim(),
      blockers: blockers.trim(),
      decisions: decisions.trim(),
      nextSteps: nextSteps.trim(),
      mood,
      createdAt: Date.now(),
    });
    // Reset
    setCurrentWork('');
    setBlockers('');
    setDecisions('');
    setNextSteps('');
    setMood('good');
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Mood picker */}
      <div>
        <label className="input-label">Session mood</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {MOOD_OPTIONS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMood(m.value)}
              title={m.label}
              style={{
                flex: 1, padding: '8px 4px', border: 'none', borderRadius: 10, cursor: 'pointer',
                background: mood === m.value
                  ? `rgba(${hexToRgb(m.color)},0.18)`
                  : 'rgba(255,255,255,0.03)',
                outline: mood === m.value ? `1.5px solid ${m.color}` : '1.5px solid transparent',
                fontSize: 18, transition: 'all 0.15s',
                transform: mood === m.value ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              {m.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Current Work — required */}
      <div>
        <label className="input-label">
          What are you working on?{' '}
          <span className="input-required">*</span>
        </label>
        <textarea
          className="textarea"
          value={currentWork}
          onChange={(e) => setCurrentWork(e.target.value)}
          placeholder="Describe your current focus or progress…"
          rows={3}
          maxLength={500}
          required
          style={{ minHeight: 80 }}
        />
      </div>

      {/* Blockers — optional */}
      <div>
        <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Where are you stuck?{' '}
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>optional</span>
        </label>
        <textarea
          className="textarea"
          value={blockers}
          onChange={(e) => setBlockers(e.target.value)}
          placeholder="Any blockers, unknowns, or unresolved questions…"
          rows={2}
          maxLength={300}
          style={{ minHeight: 60 }}
        />
      </div>

      {/* Decisions — optional */}
      <div>
        <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Decisions made{' '}
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>optional</span>
        </label>
        <textarea
          className="textarea"
          value={decisions}
          onChange={(e) => setDecisions(e.target.value)}
          placeholder="What did you decide or finalize this session?"
          rows={2}
          maxLength={300}
          style={{ minHeight: 60 }}
        />
      </div>

      {/* Next steps — optional */}
      <div>
        <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Next move{' '}
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>optional</span>
        </label>
        <input
          className="input"
          value={nextSteps}
          onChange={(e) => setNextSteps(e.target.value)}
          placeholder="What's the first thing you'll do next time?"
          maxLength={200}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="btn btn-primary"
        disabled={!currentWork.trim() || saving}
        style={{ marginTop: 4 }}
      >
        {saving ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="spinner" />
            Writing to Walrus Memory…
          </span>
        ) : saved ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            ✓ Checkpoint saved on Walrus
          </span>
        ) : (
          '💾 Save Checkpoint'
        )}
      </button>

      {/* Memory count indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)' }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#10b981',
          boxShadow: '0 0 6px rgba(16,185,129,0.6)',
          display: 'inline-block',
        }} />
        {memoryCount} memor{memoryCount !== 1 ? 'ies' : 'y'} on Walrus Mainnet
      </div>
    </form>
  );
}

// Helper: hex color to RGB components string for rgba()
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
