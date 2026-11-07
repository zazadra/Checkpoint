'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Project, ProjectColor } from '@/lib/checkpoint-types';

const COLORS: { value: ProjectColor; label: string; hex: string }[] = [
  { value: 'violet',  label: 'Violet',  hex: '#7c3aed' },
  { value: 'cyan',    label: 'Cyan',    hex: '#06b6d4' },
  { value: 'emerald', label: 'Emerald', hex: '#10b981' },
  { value: 'amber',   label: 'Amber',   hex: '#f59e0b' },
  { value: 'rose',    label: 'Rose',    hex: '#f43f5e' },
  { value: 'indigo',  label: 'Indigo',  hex: '#6366f1' },
];

interface Props {
  saving: boolean;
  onClose: () => void;
  onSave: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export function NewProjectModal({ saving, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<ProjectColor>('violet');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSave({ name: name.trim(), description: description.trim(), color });
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(6px)',
        }}
      />

      {/* Modal */}
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 401, width: '100%', maxWidth: 440,
          background: 'rgba(10,14,28,0.98)',
          border: '1px solid rgba(124,58,237,0.3)',
          borderRadius: 20, padding: '28px 28px 24px',
          boxShadow: '0 0 60px rgba(124,58,237,0.2), 0 24px 72px rgba(0,0,0,0.6)',
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, fontFamily: 'var(--heading)' }}>
          New Project
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name */}
          <div>
            <label className="input-label">Project name <span className="input-required">*</span></label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Checkpoint Hackathon"
              maxLength={60}
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="input-label">Short description <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
            <input
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you building?"
              maxLength={120}
            />
          </div>

          {/* Color */}
          <div>
            <label className="input-label">Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  title={c.label}
                  style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: c.hex, border: 'none', cursor: 'pointer',
                    outline: color === c.value ? `3px solid ${c.hex}` : '3px solid transparent',
                    outlineOffset: 2,
                    boxShadow: color === c.value ? `0 0 12px ${c.hex}` : 'none',
                    transition: 'all 0.15s',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!name.trim() || saving}
              style={{ flex: 1 }}
            >
              {saving ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="spinner" /> Saving…
                </span>
              ) : (
                'Create Project'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}
