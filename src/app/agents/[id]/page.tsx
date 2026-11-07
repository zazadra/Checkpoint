'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Cpu, Shield, CheckCircle2, Hexagon, Database, Activity, FileText } from 'lucide-react';
import { generateMockCapsules, ProofCapsule } from '@/lib/capsules';
import Link from 'next/link';

export default function AgentProfilePage() {
  const params = useParams();
  const id = params.id as string;

  // Mock data for the agent
  const agent = {
    id: id || 'gpt-4o-2024-08',
    name: 'GPT-4o Research Agent',
    developer: 'OpenAI (Verified)',
    trustScore: '98.7%',
    capsulesVerified: '1,248',
    organizations: 14,
    lastActive: '12s ago',
    description: 'Specialized autonomous agent for processing, verifying, and signing research reports and technical documentation. Cryptographically anchored on Walrus and Sui.',
    capabilities: ['Document Analysis', 'Fact Verification', 'Cryptographic Co-Signing', 'Lineage Tracing']
  };

  // Mock capsules signed by this agent
  const recentCapsules = generateMockCapsules(4).filter(c => c.aiGenerated);

  return (
    <div style={{ minHeight: '100vh', padding: '120px 24px 64px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        {/* Profile Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32, marginBottom: 64 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 120, height: 120, borderRadius: 32, background: 'linear-gradient(135deg, rgba(167,139,250,0.2), rgba(167,139,250,0.05))', border: '2px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(167,139,250,0.1)' }}>
              <Cpu size={48} color="#a78bfa" />
            </div>
            <div style={{ position: 'absolute', bottom: -8, right: -8, width: 24, height: 24, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--bg)' }}>
              <CheckCircle2 size={12} color="#fff" />
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
                {agent.name}
              </h1>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', background: 'rgba(167,139,250,0.1)', padding: '4px 10px', borderRadius: 999, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Protocol Agent
              </span>
            </div>
            
            <div style={{ fontSize: 15, color: 'var(--text-2)', marginBottom: 20 }}>
              Developed by <span style={{ color: 'var(--text-1)' }}>{agent.developer}</span>
            </div>

            <p style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.6, maxWidth: 600, marginBottom: 24 }}>
              {agent.description}
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {agent.capabilities.map(cap => (
                <div key={cap} style={{ fontSize: 12, color: 'var(--text-3)', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: 8 }}>
                  {cap}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 64 }}>
          {[
            { label: 'Trust Score', value: agent.trustScore, icon: <Shield size={16} color="#fbbf24" /> },
            { label: 'Capsules Verified', value: agent.capsulesVerified, icon: <FileText size={16} color="#67e8f9" /> },
            { label: 'Connected Orgs', value: agent.organizations, icon: <Hexagon size={16} color="#a78bfa" /> },
            { label: 'Last Active', value: agent.lastActive, icon: <Activity size={16} color="#10b981" /> },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                {stat.icon}
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stat.label}
                </span>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-1)' }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Signed Artifacts */}
        <div style={{ marginBottom: 64 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginBottom: 24 }}>Recent Co-Signed Artifacts</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
            {recentCapsules.map((capsule: ProofCapsule) => (
              <Link href={`/capsule/${capsule.id}`} key={capsule.id} style={{ textDecoration: 'none' }}>
                <div style={{ 
                  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all 0.2s', cursor: 'pointer'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.5)'; e.currentTarget.style.background = 'rgba(167,139,250,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(167,139,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={20} color="#a78bfa" />
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>{capsule.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Signed {new Date(capsule.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Database size={14} color="var(--text-3)" />
                      <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--mono)' }}>{capsule.blobId.substring(0, 10)}...</span>
                    </div>
                    <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                      Verified
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
