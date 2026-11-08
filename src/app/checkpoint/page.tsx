'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCheckpoints } from '@/hooks/useCheckpoints';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { dAppKit } from '@/app/dapp-kit';
import type { Project } from '@/lib/checkpoint-types';
import { ProjectCard } from '@/components/checkpoint/ProjectCard';
import { NewProjectModal } from '@/components/checkpoint/NewProjectModal';
import { ProjectDetail } from '@/components/checkpoint/ProjectDetail';
import { WalletGate } from '@/components/checkpoint/WalletGate';
import { CheckpointBot } from '@/components/checkpoint/CheckpointBot';

const COLOR_OPTIONS = [
  { value: 'violet', label: 'Violet', hex: '#7c3aed' },
  { value: 'cyan', label: 'Cyan', hex: '#06b6d4' },
  { value: 'emerald', label: 'Emerald', hex: '#10b981' },
  { value: 'amber', label: 'Amber', hex: '#f59e0b' },
  { value: 'rose', label: 'Rose', hex: '#f43f5e' },
  { value: 'indigo', label: 'Indigo', hex: '#6366f1' },
] as const;

export default function CheckpointPage() {
  const { isConnected, address } = useWalletConnection();
  const { projects, checkpoints, loading, saving, error, suiBalance, addProject } = useCheckpoints();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);

  // Not connected — show gate
  if (!isConnected) {
    return <WalletGate />;
  }

  // Project selected — show detail view
  if (selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject}
        onBack={() => setSelectedProject(null)}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        padding: '80px 24px 48px',
        maxWidth: 900,
        margin: '0 auto',
      }}
    >
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 40 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <h1
              className="heading gradient-text"
              style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.15, marginBottom: 6 }}
            >
              Checkpoint
            </h1>
            <p style={{ color: 'var(--text-2)', fontSize: 15 }}>
              Your work, remembered across every session.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Tatum RPC — SUI balance */}
            {suiBalance !== '—' && (
              <div
                className="addr-chip"
                title="SUI balance via Tatum RPC"
                style={{ fontSize: 12 }}
              >
                <span style={{ color: '#4ade80', fontSize: 10 }}>◈</span>
                <span className="mono">{suiBalance} SUI</span>
              </div>
            )}
            <ConnectButton instance={dAppKit} />
          </div>
        </div>

        {/* Wallet memory indicator */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 8,
            fontSize: 11,
            color: '#34d399',
            marginTop: 10,
          }}
        >
          <span className="anim-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          Memory on Mainnet · {address?.slice(0, 6)}…{address?.slice(-4)}
        </div>
      </motion.div>

      {/* ── Error ── */}
      {error && (
        <div className="alert-error" style={{ marginBottom: 24 }}>
          {error}
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 160, borderRadius: 18 }} />
          ))}
        </div>
      )}

      {/* ── Projects grid ── */}
      {!loading && (
        <>
          {projects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card"
              style={{
                padding: '60px 40px',
                textAlign: 'center',
                border: '1px dashed rgba(124,58,237,0.25)',
                background: 'rgba(124,58,237,0.04)',
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 16 }}>🧠</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No projects yet</h3>
              <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 24 }}>
                Create your first project and start logging checkpoints.
                <br />
                Your context will be remembered across every session.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => setShowNewProject(true)}
              >
                + New Project
              </button>
            </motion.div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <p style={{ color: 'var(--text-2)', fontSize: 13 }}>
                  {projects.length} project{projects.length !== 1 ? 's' : ''} ·{' '}
                  {checkpoints.length} checkpoint{checkpoints.length !== 1 ? 's' : ''} stored
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowNewProject(true)}
                >
                  + New Project
                </button>
              </div>
              <motion.div
                layout
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))', gap: 16 }}
              >
                <AnimatePresence>
                  {projects.map((project, i) => {
                    const projectCheckpoints = checkpoints.filter((c) => c.projectId === project.id);
                    return (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        checkpointCount={projectCheckpoints.length}
                        lastCheckpoint={projectCheckpoints.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null}
                        index={i}
                        onClick={() => setSelectedProject(project)}
                      />
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            </>
          )}
        </>
      )}

      {/* ── New Project Modal ── */}
      <AnimatePresence>
        {showNewProject && (
          <NewProjectModal
            saving={saving}
            onClose={() => setShowNewProject(false)}
            onSave={async (data) => {
              await addProject(data);
              setShowNewProject(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Floating AI Memory Assistant ── */}
      {isConnected && <CheckpointBot />}
    </div>
  );
}
