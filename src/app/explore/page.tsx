'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Network, TrendingUp, Cpu, Shield, Clock } from 'lucide-react';
import Link from 'next/link';
import { generateMockCapsules, ProofCapsule } from '@/lib/capsules';

const STAGGER = 0.1;

export default function ExplorePage() {
  const trendingCapsules = generateMockCapsules(4);
  const recentProofs = generateMockCapsules(8);

  const topAgents = [
    { id: 'gpt-4o-2024-08', name: 'GPT-4o Research Agent', verified: 1248, orgs: 14 },
    { id: 'claude-3-5-sonnet', name: 'Claude Legal Analyst', verified: 932, orgs: 8 },
    { id: 'gemini-1-5-pro', name: 'Gemini Code Auditor', verified: 615, orgs: 11 },
  ];

  return (
    <div style={{ minHeight: '100vh', padding: '120px 24px 64px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: 64, textAlign: 'center' }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', padding: '6px 16px', borderRadius: 999, marginBottom: 24 }}
          >
            <Network size={14} color="#a78bfa" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Public Trust Network
            </span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ fontSize: 48, fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.02em', marginBottom: 16 }}
          >
            Explore the Protocol
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ fontSize: 18, color: 'var(--text-2)', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}
          >
            Discover trending verification capsules, top AI agents, and a real-time feed of the internet's verified reality.
          </motion.p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 40 }}>
          
          {/* Main Feed */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <TrendingUp size={20} color="var(--text-1)" />
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>Trending Proofs</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 64 }}>
              {trendingCapsules.map((capsule, i) => (
                <Link href={`/capsule/${capsule.id}`} key={capsule.id} style={{ textDecoration: 'none' }}>
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * STAGGER }}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, height: '100%', transition: 'all 0.2s', cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Verified
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {Math.floor(Math.random() * 60)}m ago
                      </div>
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8, lineHeight: 1.3 }}>
                      {capsule.title}
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {capsule.description}
                    </p>
                  </motion.div>
                </Link>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <Clock size={20} color="var(--text-1)" />
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>Recently Anchored</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentProofs.map((capsule, i) => (
                <Link href={`/capsule/${capsule.id}`} key={capsule.id} style={{ textDecoration: 'none' }}>
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.05 }}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s', cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Shield size={18} color="var(--text-2)" />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>{capsule.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>ID: {capsule.blobId.substring(0, 16)}...</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {capsule.aiGenerated && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(167,139,250,0.1)', color: '#a78bfa', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                          <Cpu size={12} /> AI Co-Signed
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        Just now
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>

          </div>

          {/* Sidebar */}
          <div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, position: 'sticky', top: 120 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                <Cpu size={18} color="#a78bfa" />
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>Most Trusted Agents</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {topAgents.map((agent, i) => (
                  <Link href={`/agents/${agent.id}`} key={agent.id} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, transition: 'all 0.2s', cursor: 'pointer' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-3)', width: 24 }}>{i + 1}</div>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(167,139,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Cpu size={16} color="#a78bfa" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>{agent.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{agent.verified.toLocaleString()} capsules verified</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              
              <div style={{ height: 1, background: 'var(--border)', margin: '24px 0' }} />

              <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
                The Trust Network is powered by <strong style={{ color: 'var(--text-1)' }}>Walrus</strong> decentralized storage and anchored to the <strong style={{ color: 'var(--text-1)' }}>Sui</strong> blockchain.
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
