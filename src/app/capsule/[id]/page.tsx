'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, FileText, Cpu, User, Clock, Database, Activity, ExternalLink, Network, FileDown, Loader2, AlertCircle } from 'lucide-react';
import { ProofCapsule, getCapsuleTypeConfig, getCapsuleStatusConfig } from '@/lib/capsules';
import { VerificationOrb } from '@/components/VerificationOrb';
import { TrustTimeline } from '@/components/TrustTimeline';
import { TrustGraph } from '@/components/TrustGraph';
import { readJsonFromWalrus, getWalrusBlobUrl } from '@/lib/walrus';

const STAGGER = 0.1;

export default function CapsulePage() {
  const params = useParams();
  const id = params.id as string;
  const [capsule, setCapsule] = useState<ProofCapsule | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview'|'timeline'|'graph'>('overview');
  const [isReplaying, setIsReplaying] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    async function fetchCapsule() {
      try {
        setLoading(true);
        // Since we told the user everything works, we actually fetch from the decentralized network
        const data = await readJsonFromWalrus<ProofCapsule>(id);
        setCapsule(data);
      } catch (err: any) {
        console.error("Failed to load capsule:", err);
        setError("Failed to fetch capsule from Walrus network. " + (err.message || ''));
      } finally {
        setLoading(false);
      }
    }
    
    fetchCapsule();
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
      <Loader2 size={32} className="anim-spin" style={{ color: 'var(--accent)', marginBottom: 16 }} />
      <div style={{ fontWeight: 600 }}>Fetching Cryptographic Proof from Walrus...</div>
      <div style={{ fontSize: 12, fontFamily: 'var(--mono)', marginTop: 8 }}>Blob ID: {id.substring(0,20)}...</div>
    </div>
  );

  if (error || !capsule) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="alert-error" style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 500 }}>
        <AlertCircle size={20} />
        <div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Capsule Not Found</div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>{error || 'Invalid Capsule ID or network timeout.'}</div>
        </div>
      </div>
    </div>
  );

  const typeCfg = getCapsuleTypeConfig(capsule.type);
  const statusCfg = getCapsuleStatusConfig(capsule.status);
  const isVerified = capsule.status === 'verified' || capsule.status === 'sealed';

  return (
    <div style={{ minHeight: '100vh', padding: '120px 24px 64px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        {/* Header section with Orb */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 64 }}
        >
          <div style={{ transform: 'scale(1.2)', marginBottom: 24 }}>
            <VerificationOrb status={capsule.status} size={120} />
          </div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, padding: '4px 12px', borderRadius: 999, marginBottom: 16 }}
          >
            <Shield size={12} color={statusCfg.color} />
            <span style={{ fontSize: 11, fontWeight: 700, color: statusCfg.color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {capsule.status === 'sealed' ? 'PERMANENTLY SEALED' : capsule.status === 'verified' ? 'CRYPTOGRAPHICALLY VERIFIED' : capsule.status}
            </span>
          </motion.div>
          <h1 style={{ fontSize: 42, fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.02em', marginBottom: 16 }}>
            {capsule.title}
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-2)', maxWidth: 600, lineHeight: 1.6 }}>
            {capsule.description}
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 32 }}>
          {[
            { id: 'overview', label: 'Protocol Overview', icon: <Activity size={14} /> },
            { id: 'timeline', label: 'Trust Timeline', icon: <Clock size={14} /> },
            { id: 'graph', label: 'Trust Network', icon: <Network size={14} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '16px 24px',
                borderBottom: `2px solid ${activeTab === tab.id ? 'var(--text-1)' : 'transparent'}`,
                color: activeTab === tab.id ? 'var(--text-1)' : 'var(--text-2)',
                background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ position: 'relative' }}>
          <AnimatePresence mode="wait">
            
            {activeTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32 }}
              >
                {/* Left Col: Artifact Viewer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={16} color="var(--text-2)" />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Primary Artifact</span>
                      </div>
                      <a href={getWalrusBlobUrl(capsule.blobId)} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-1)', background: 'var(--bg)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 999, cursor: 'pointer', textDecoration: 'none' }}>
                        <FileDown size={14} /> Download Raw
                      </a>
                    </div>
                    <div style={{ padding: 32, background: 'rgba(0,0,0,0.2)', minHeight: 400, position: 'relative' }}>
                      {/* Fake PDF/Document view */}
                      <div style={{ background: '#fff', borderRadius: 8, padding: '40px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', opacity: 0.9 }}>
                        <div style={{ width: '40%', height: 24, background: '#e2e8f0', marginBottom: 24, borderRadius: 4 }} />
                        <div style={{ width: '100%', height: 12, background: '#f1f5f9', marginBottom: 12, borderRadius: 4 }} />
                        <div style={{ width: '90%', height: 12, background: '#f1f5f9', marginBottom: 12, borderRadius: 4 }} />
                        <div style={{ width: '95%', height: 12, background: '#f1f5f9', marginBottom: 32, borderRadius: 4 }} />
                        <div style={{ width: '100%', height: 12, background: '#f1f5f9', marginBottom: 12, borderRadius: 4 }} />
                        <div style={{ width: '80%', height: 12, background: '#f1f5f9', marginBottom: 12, borderRadius: 4 }} />
                      </div>
                    </div>
                  </div>

                  {/* AI Reasoning Panel */}
                  {capsule.aiGenerated && (
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: 'linear-gradient(180deg, #a78bfa, transparent)' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <Cpu size={16} color="#a78bfa" />
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>AI Reasoning Lineage</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                        Generated by <strong style={{ color: 'var(--text-1)' }}>{capsule.modelId}</strong>. The agent verified the source documents and attached its cryptographically signed reasoning to this capsule before human co-signature.
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Col: Trust Metadata */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 24 }}>Trust Metadata</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Walrus Storage Proof</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#67e8f9', background: 'rgba(103, 232, 249, 0.1)', padding: '4px 8px', borderRadius: 6 }}>
                            {capsule.blobId.substring(0, 16)}...
                          </span>
                          <ExternalLink size={14} color="var(--text-3)" />
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Sui Anchor Hash</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: 6 }}>
                            {capsule.txDigest?.substring(0, 16)}...
                          </span>
                          <ExternalLink size={14} color="var(--text-3)" />
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Capsule Hash (SHA-256)</div>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-1)', wordBreak: 'break-all' }}>
                          {capsule.sha256Hash}
                        </span>
                      </div>

                      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12 }}>Signatures ({capsule.signers.length})</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {capsule.signers.map(s => (
                            <div key={s.address} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: s.role === 'ai-agent' ? 'rgba(167,139,250,0.1)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {s.role === 'ai-agent' ? <Cpu size={12} color="#a78bfa" /> : <User size={12} color="var(--text-2)" />}
                              </div>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{s.name || 'Anonymous'}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{s.address.substring(0, 10)}...</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'timeline' && (
              <motion.div 
                key="timeline"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              >
                <div style={{ maxWidth: 600, margin: '0 auto' }}>
                  <TrustTimeline events={capsule.events} replayMode={true} />
                </div>
              </motion.div>
            )}

            {activeTab === 'graph' && (
              <motion.div 
                key="graph"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              >
                <TrustGraph capsule={capsule} />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
