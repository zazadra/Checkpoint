'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Search, ArrowRight, CheckCircle2, Lock, Globe, Hash, Database, Zap } from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

function VerifyOrb() {
  return (
    <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 28px' }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(124,58,237,0.15)', borderTopColor: 'rgba(124,58,237,0.55)' }}
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'absolute', inset: 14, borderRadius: '50%', border: '1px dashed rgba(16,185,129,0.15)', borderTopColor: 'rgba(16,185,129,0.55)' }}
      />
      <motion.div
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', inset: 26, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, rgba(124,58,237,0.45), rgba(7,12,26,0.9))',
          border: '1px solid rgba(124,58,237,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 0 8px rgba(124,58,237,0.05), 0 0 32px rgba(124,58,237,0.25)',
        }}
      >
        <Shield size={20} style={{ color: '#c4b5fd' }} />
      </motion.div>
      {/* Orbiting green dot */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'absolute', inset: 0, borderRadius: '50%' }}
      >
        <div style={{ position: 'absolute', top: '50%', left: -4, width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981', transform: 'translateY(-50%)' }} />
      </motion.div>
    </div>
  );
}

export default function VerifyPage() {
  const [input, setInput] = useState('');
  const router = useRouter();

  const handleSearch = () => {
    const val = input.trim();
    if (!val) return;
    router.push(`/verify/${val}`);
  };

  return (
    <main style={{ minHeight: '100vh', padding: '110px 24px 80px', position: 'relative', overflow: 'hidden' }}>
      {/* Ambient blobs */}
      <div style={{ position: 'absolute', top: '8%', left: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.06), transparent 70%)', filter: 'blur(70px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '15%', right: '5%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.05), transparent 70%)', filter: 'blur(70px)', pointerEvents: 'none' }} />

      <motion.div initial="hidden" animate="show" variants={stagger} style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Header */}
        <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 44 }}>
          <VerifyOrb />
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 999, marginBottom: 20, fontSize: 12, fontWeight: 600, color: '#34d399' }}>
            <Globe size={10} /> Public · No account required
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.08, marginBottom: 14 }}>
            Verify any document.{' '}
            <span style={{ background: 'linear-gradient(135deg, #34d399, #67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Instantly.
            </span>
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.65, maxWidth: 460, margin: '0 auto' }}>
            Enter a File ID from a shared WalSign document to verify its authenticity, ownership, and integrity.
          </p>
        </motion.div>

        {/* Search box */}
        <motion.div variants={fadeUp}>
          <div style={{ background: 'rgba(7,12,26,0.8)', border: '1px solid var(--border)', borderRadius: 20, padding: '28px 32px', marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 12 }}>
              File ID or Verification Link
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Hash size={13} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="e.g. Cm9pNW7HqL2fZxYe…"
                  style={{
                    width: '100%', height: 46, paddingLeft: 38, paddingRight: 14,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                    borderRadius: 10, color: 'var(--text-1)', fontSize: 13,
                    fontFamily: 'var(--mono)', outline: 'none',
                  }}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={!input.trim()}
                style={{
                  flexShrink: 0, height: 46, padding: '0 20px', borderRadius: 10, border: 'none',
                  background: input.trim() ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'rgba(255,255,255,0.04)',
                  color: input.trim() ? '#fff' : 'var(--text-3)', cursor: input.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7, transition: 'all 0.2s',
                  boxShadow: input.trim() ? '0 4px 16px rgba(124,58,237,0.35)' : 'none',
                }}
              >
                <Search size={15} /> Verify
              </button>
            </div>

            {/* Trust chips */}
            <div style={{ display: 'flex', gap: 14, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
              {[
                { icon: <Lock size={11} />, label: 'No account needed', color: '#34d399' },
                { icon: <Globe size={11} />, label: 'Publicly verifiable', color: '#67e8f9' },
                { icon: <Zap size={11} />, label: 'Instant results', color: '#fbbf24' },
                { icon: <Database size={11} />, label: 'Walrus network', color: '#a78bfa' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>
                  <span style={{ color: item.color }}>{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* How it works */}
        <motion.div variants={fadeUp}>
          <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 20 }}>
              How Verification Works
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { step: '01', color: '#a78bfa', title: 'Fetch metadata', desc: 'Your File ID is used to retrieve the document record from Walrus decentralized storage.' },
                { step: '02', color: '#67e8f9', title: 'Check integrity', desc: 'The SHA-256 fingerprint confirms the file has not been altered since it was uploaded.' },
                { step: '03', color: '#34d399', title: 'Show proof', desc: 'Owner wallet, upload timestamp, encryption status — all displayed clearly with no ambiguity.' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: item.color, letterSpacing: '0.08em', minWidth: 24, paddingTop: 1 }}>{item.step}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tip */}
        <motion.div variants={fadeUp} style={{ marginTop: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7 }}>
            Don't have a File ID?{' '}
            <a href="/upload" style={{ color: 'var(--accent-2)', textDecoration: 'none', fontWeight: 600 }}>Upload a document →</a>
          </p>
        </motion.div>

      </motion.div>
    </main>
  );
}
