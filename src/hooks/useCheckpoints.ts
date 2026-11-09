'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWalletConnection } from './useWalletConnection';
import { dAppKit } from '@/app/dapp-kit';
import {
  loadCheckpointIndex,
  saveCheckpoint,
  createProject,
  getProjectCheckpoints,
  computeInsights,
  getWalletSuiBalance,
} from '@/lib/checkpoint-memory';
import type {
  CheckpointEntry,
  CheckpointIndex,
  Project,
  ProjectInsight,
} from '@/lib/checkpoint-types';

// ---------------------------------------------------------------------------
// useCheckpoints — main data hook
// ---------------------------------------------------------------------------

export function useCheckpoints() {
  const { address, isConnected } = useWalletConnection();
  const [index, setIndex] = useState<CheckpointIndex | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suiBalance, setSuiBalance] = useState<string>('—');

  /** Load full index from Walrus Memory */
  const refresh = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const data = await loadCheckpointIndex(address);
      setIndex(
        data ?? {
          version: 1,
          projects: [],
          checkpoints: [],
          lastUpdated: Date.now(),
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [address]);

  /** Load SUI balance via Tatum RPC */
  const fetchBalance = useCallback(async () => {
    if (!address) return;
    const bal = await getWalletSuiBalance(address);
    setSuiBalance(bal);
  }, [address]);

  // Initial load when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      refresh();
      fetchBalance();
    } else {
      setIndex(null);
      setSuiBalance('—');
    }
  }, [isConnected, address, refresh, fetchBalance]);

  /** Create a new project with wallet signature approval */
  const addProject = useCallback(
    async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!address) throw new Error('Wallet not connected');
      setSaving(true);
      setError(null);
      try {
        // ── 1. Prompt Wallet Approval Popup ──────────────────────────
        let signature: string | undefined;
        try {
          const msg = new TextEncoder().encode(
            `Checkpoint: Create Project\nName: ${project.name}\nOwner: ${address}\nTimestamp: ${new Date().toISOString()}`
          );
          const signed = await dAppKit.signPersonalMessage({ message: msg });
          signature = signed.signature;
        } catch (walletErr: any) {
          console.warn('[Checkpoint] Wallet signing prompt cancelled or failed:', walletErr);
          throw new Error('Wallet approval required to create project. Please sign the request in your wallet.');
        }

        // ── 2. Persist project with cryptographic signature ──────────
        const created = await createProject(address, { ...project, signature });
        await refresh();
        return created;
      } finally {
        setSaving(false);
      }
    },
    [address, refresh]
  );

  /** Save a new checkpoint entry with wallet signature approval */
  const addCheckpoint = useCallback(
    async (entry: Omit<CheckpointEntry, 'id' | 'walrusOwner' | 'blobId'>) => {
      if (!address) throw new Error('Wallet not connected');
      setSaving(true);
      setError(null);
      try {
        // ── 1. Prompt Wallet Approval Popup ──────────────────────────
        let signature: string | undefined;
        try {
          const msg = new TextEncoder().encode(
            `Checkpoint: Log Session\nMood: ${entry.mood}\nTask: ${entry.currentWork.slice(0, 100)}\nOwner: ${address}\nTimestamp: ${new Date().toISOString()}`
          );
          const signed = await dAppKit.signPersonalMessage({ message: msg });
          signature = signed.signature;
        } catch (walletErr: any) {
          console.warn('[Checkpoint] Wallet signing prompt cancelled or failed:', walletErr);
          throw new Error('Wallet approval required to commit checkpoint. Please sign the request in your wallet.');
        }

        // ── 2. Persist checkpoint with cryptographic signature ────────
        const saved = await saveCheckpoint(address, { ...entry, signature });
        await refresh();
        return saved;
      } finally {
        setSaving(false);
      }
    },
    [address, refresh]
  );

  return {
    index,
    loading,
    saving,
    error,
    suiBalance,
    refresh,
    addProject,
    addCheckpoint,
    projects: index?.projects ?? [],
    checkpoints: index?.checkpoints ?? [],
  };
}

// ---------------------------------------------------------------------------
// useProjectInsights — compute insights for a single project
// ---------------------------------------------------------------------------

export function useProjectInsights(
  projectId: string | null
): ProjectInsight | null {
  const { address } = useWalletConnection();
  const [insights, setInsights] = useState<ProjectInsight | null>(null);

  useEffect(() => {
    if (!address || !projectId) {
      setInsights(null);
      return;
    }
    getProjectCheckpoints(address, projectId).then((checkpoints) => {
      setInsights(computeInsights(projectId, checkpoints));
    });
  }, [address, projectId]);

  return insights;
}
