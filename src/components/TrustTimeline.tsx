'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProofEvent } from '@/lib/capsules';
import { CheckCircle2, Cpu, Database, Edit, Lock, Shield, User, FileText, FastForward } from 'lucide-react';
import { formatIdentity } from '@/lib/suins';

interface TrustTimelineProps {
  events: ProofEvent[];
  replayMode?: boolean;
}

const EVENT_CONFIG = {
  created: { icon: <FileText size={14} />, color: '#67e8f9', label: 'Artifact Generated' },
  'agent-signed': { icon: <Cpu size={14} />, color: '#a78bfa', label: 'AI Agent Signed' },
  signed: { icon: <User size={14} />, color: '#fbbf24', label: 'Human Co-Signed' },
  anchored: { icon: <Database size={14} />, color: '#3b82f6', label: 'Anchored to Walrus' },
  verified: { icon: <CheckCircle2 size={14} />, color: '#10b981', label: 'Verification Passed' },
  contested: { icon: <Edit size={14} />, color: '#ef4444', label: 'Proof Contested' },
  sealed: { icon: <Lock size={14} />, color: '#8b5cf6', label: 'Permanently Sealed' },
};

function shorten(str?: string) {
  if (!str) return '';
  if (str.startsWith('0x')) return `${str.slice(0, 6)}…${str.slice(-4)}`;
  return str;
}

export function TrustTimeline({ events, replayMode = false }: TrustTimelineProps) {
  const [visibleCount, setVisibleCount] = useState(replayMode ? 0 : events.length);
  const [isReplaying, setIsReplaying] = useState(replayMode);

  // Sort events chronologically
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

  useEffect(() => {
    if (!isReplaying || visibleCount >= sortedEvents.length) {
      if (visibleCount >= sortedEvents.length) setIsReplaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setVisibleCount(v => v + 1);
    }, 1200); // 1.2s delay between events during replay

    return () => clearTimeout(timer);
  }, [isReplaying, visibleCount, sortedEvents.length]);

  const handleStartReplay = () => {
    setVisibleCount(0);
    setIsReplaying(true);
  };

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
      
      {/* Replay Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>Verification Timeline</h3>
        <button 
          onClick={handleStartReplay} 
          disabled={isReplaying}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
            padding: '6px 12px', borderRadius: 999,
            fontSize: 11, fontWeight: 700, color: isReplaying ? 'var(--text-3)' : 'var(--text-2)',
            cursor: isReplaying ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
          }}
        >
          <FastForward size={12} />
          {isReplaying ? 'Replaying...' : 'Replay History'}
        </button>
      </div>

      <div style={{ position: 'relative', paddingLeft: 20 }}>
        {/* Continuous Line */}
        <div style={{ 
          position: 'absolute', top: 10, bottom: 20, left: 27, width: 2, 
          background: 'var(--border)', borderRadius: 2, zIndex: 0 
        }} />

        {/* Animated progressive line during replay */}
        {isReplaying && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(visibleCount / Math.max(1, sortedEvents.length - 1)) * 100}%` }}
            transition={{ duration: 1.2, ease: 'linear' }}
            style={{ 
              position: 'absolute', top: 10, left: 27, width: 2, 
              background: 'linear-gradient(180deg, #8b5cf6, #10b981)', 
              borderRadius: 2, zIndex: 1 
            }} 
          />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'relative', zIndex: 2 }}>
          <AnimatePresence>
            {sortedEvents.slice(0, visibleCount).map((ev, i) => {
              const cfg = EVENT_CONFIG[ev.type] || EVENT_CONFIG['created'];
              const isLast = i === visibleCount - 1 && isReplaying;
              
              return (
                <motion.div 
                  key={ev.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  style={{ display: 'flex', gap: 16 }}
                >
                  {/* Timeline Dot Node */}
                  <div style={{ position: 'relative', flexShrink: 0, marginTop: 2 }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: `${cfg.color}20`, border: `2px solid ${cfg.color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 0 10px ${cfg.color}40`, zIndex: 3
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
                    </div>
                    {/* Pulse effect if it's the latest event being replayed */}
                    {isLast && (
                      <motion.div
                        initial={{ scale: 1, opacity: 0.8 }}
                        animate={{ scale: 2.5, opacity: 0 }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                        style={{
                          position: 'absolute', top: -2, left: -2, width: 20, height: 20,
                          borderRadius: '50%', border: `2px solid ${cfg.color}`, pointerEvents: 'none'
                        }}
                      />
                    )}
                  </div>

                  {/* Content Card */}
                  <div style={{
                    flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '12px 16px', position: 'relative', overflow: 'hidden'
                  }}>
                    {/* Left accent border */}
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: cfg.color }} />
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: cfg.color }}>{cfg.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{cfg.label}</span>
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
                        {new Date(ev.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 8 }}>
                      {ev.description}
                    </div>

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: 'var(--text-3)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 999 }}>
                        {ev.actorRole === 'ai-agent' ? <Cpu size={10} style={{ color: '#a78bfa' }} /> : <User size={10} />}
                        {shorten(ev.actor)}
                      </div>
                      {ev.txDigest && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-3)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 999 }}>
                          <Shield size={10} style={{ color: '#67e8f9' }} />
                          tx:{shorten(ev.txDigest)}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
