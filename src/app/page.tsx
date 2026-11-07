'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Shield, Lock, CheckCircle2, Globe, ArrowRight, Upload, Eye, Share2, FileText, Users, Briefcase, Palette, Star, Zap, Key, Database } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }
};
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

/* ── Shield Icon with glow ──────────────────────────────────── */
function HeroShield() {
  return (
    <div style={{ position: 'relative', width: 240, height: 240, flexShrink: 0 }}>
      {/* Outer ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(124,58,237,0.12)', borderTopColor: 'rgba(124,58,237,0.5)' }}
      />
      {/* Middle ring */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'absolute', inset: 24, borderRadius: '50%', border: '1px dashed rgba(16,185,129,0.15)', borderTopColor: 'rgba(16,185,129,0.5)' }}
      />
      {/* Core */}
      <motion.div
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', inset: 50, borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 35%, rgba(124,58,237,0.45), rgba(7,12,26,0.95))',
          border: '1px solid rgba(124,58,237,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 0 12px rgba(124,58,237,0.05), 0 0 50px rgba(124,58,237,0.35)',
        }}
      >
        <Lock size={36} style={{ color: '#c4b5fd', filter: 'drop-shadow(0 0 10px rgba(167,139,250,0.6))' }} />
      </motion.div>
      {/* Orbiting dot — green */}
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'absolute', inset: 0, borderRadius: '50%' }}>
        <div style={{ position: 'absolute', top: '50%', left: -5, width: 10, height: 10, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 14px #10b981', transform: 'translateY(-50%)' }} />
      </motion.div>
    </div>
  );
}

/* ── Flow Step ──────────────────────────────────────────────── */
function FlowStep({ n, icon, label, desc, color }: { n: number; icon: React.ReactNode; label: string; desc: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, minWidth: 100 }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%', marginBottom: 12,
        background: `${color}12`, border: `1px solid ${color}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, boxShadow: `0 0 18px ${color}18`,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Step {n}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}

/* ── Value Prop Card ────────────────────────────────────────── */
function ValueCard({ icon, title, desc, color }: { icon: React.ReactNode; title: string; desc: string; color: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '24px', transition: 'border-color 0.2s',
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}14`, border: `1px solid ${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, marginBottom: 16 }}>
        {icon}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

/* ── Use Case Pill ──────────────────────────────────────────── */
function UsePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px',
      background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)',
      borderRadius: 999, fontSize: 13, fontWeight: 500, color: 'var(--text-2)',
    }}>
      <span style={{ color: 'var(--accent-2)' }}>{icon}</span>
      {label}
    </div>
  );
}

/* ── Tech Badge ─────────────────────────────────────────────── */
function TechBadge({ name, role, color }: { name: string; role: string; color: string }) {
  return (
    <div style={{
      padding: '18px 22px', background: 'rgba(255,255,255,0.02)',
      border: '1px solid var(--border)', borderRadius: 14,
      borderTop: `2px solid ${color}`,
    }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{role}</div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section style={{ padding: '130px 24px 100px', position: 'relative', overflow: 'hidden' }}>
        {/* Ambient glows */}
        <div style={{ position: 'absolute', top: '5%', left: '10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.06), transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20%', right: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.05), transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />

        <motion.div initial="hidden" animate="show" variants={stagger}
          style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 72, flexWrap: 'wrap', justifyContent: 'center' }}>

          {/* Left: copy */}
          <motion.div variants={fadeUp} style={{ flex: '1 1 400px', maxWidth: 580 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px',
              background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)',
              borderRadius: 999, marginBottom: 28,
            }}>
              <Shield size={12} color="#a78bfa" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#a78bfa', letterSpacing: '0.04em' }}>Built on Walrus · Seal · Sui</span>
            </div>
            <h1 style={{
              fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 900, letterSpacing: '-0.04em',
              lineHeight: 1.04, marginBottom: 24, fontFamily: 'var(--heading)',
            }}>
              Private.{' '}
              <span style={{ background: 'linear-gradient(135deg, #a78bfa, #67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Permanent.
              </span>{' '}
              Verifiable.
            </h1>
            <p style={{ fontSize: 18, color: 'var(--text-2)', lineHeight: 1.65, marginBottom: 36, maxWidth: 480 }}>
              Securely store and share encrypted documents on decentralized storage. Prove authenticity. Control access. Forever.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/upload" className="btn btn-primary" style={{
                height: 52, paddingLeft: 28, paddingRight: 28, fontSize: 15, fontWeight: 700,
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                boxShadow: '0 4px 24px rgba(124,58,237,0.4)',
                display: 'inline-flex', alignItems: 'center', gap: 10, borderRadius: 999, textDecoration: 'none', color: '#fff',
              }}>
                <Upload size={16} /> Upload a File
              </Link>
              <Link href="/verify" className="btn btn-secondary" style={{
                height: 52, paddingLeft: 24, paddingRight: 24, fontSize: 15, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 10, borderRadius: 999, textDecoration: 'none',
                border: '1px solid var(--border-2)', color: 'var(--text-2)', background: 'rgba(255,255,255,0.03)',
              }}>
                <Eye size={16} /> Verify a Document <ArrowRight size={14} />
              </Link>
            </div>
            {/* Social proof */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 32 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[...Array(5)].map((_, i) => <Star key={i} size={13} fill="#f59e0b" color="#f59e0b" />)}
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Immutable once stored. Verifiable by anyone.</span>
            </div>
          </motion.div>

          {/* Right: orb */}
          <motion.div variants={fadeUp} style={{ flexShrink: 0 }}>
            <HeroShield />
          </motion.div>
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', borderTop: '1px solid var(--border)' }}>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
          style={{ maxWidth: 960, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Simple by Design</div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, letterSpacing: '-0.03em' }}>How it works</h2>
          </motion.div>

          <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'flex-start', gap: 0, padding: '40px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border)', borderRadius: 24 }}>
            <FlowStep n={1} icon={<Upload size={20} />} label="Upload" desc="Drag and drop any file — PDF, image, contract" color="#a78bfa" />
            <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', margin: '0 8px', flexShrink: 0 }} />
            <FlowStep n={2} icon={<Lock size={20} />} label="Encrypt" desc="Sealed with your wallet. Only you control access" color="#67e8f9" />
            <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', margin: '0 8px', flexShrink: 0 }} />
            <FlowStep n={3} icon={<Database size={20} />} label="Store" desc="Stored permanently on Walrus decentralized network" color="#10b981" />
            <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', margin: '0 8px', flexShrink: 0 }} />
            <FlowStep n={4} icon={<Share2 size={20} />} label="Share" desc="Generate a secure link — public or wallet-gated" color="#f59e0b" />
            <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', margin: '0 8px', flexShrink: 0 }} />
            <FlowStep n={5} icon={<CheckCircle2 size={20} />} label="Verify" desc="Anyone can verify authenticity. No account needed." color="#34d399" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── WHY WALSIGN ──────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px' }}>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
          style={{ maxWidth: 960, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--verify-2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Why WalSign</div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 16 }}>
              Documents that can't lie
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-2)', maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}>
              Once stored, your files can never be silently changed or deleted. Every document comes with cryptographic proof.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <ValueCard icon={<Lock size={18} />} title="End-to-End Encrypted" desc="Your files are encrypted with Seal before they ever leave your browser. We never see the contents." color="#a78bfa" />
            <ValueCard icon={<Globe size={18} />} title="Decentralized Storage" desc="Stored on Walrus — a decentralized network. No single company can delete or alter your files." color="#10b981" />
            <ValueCard icon={<Key size={18} />} title="Wallet-Based Access" desc="Your Sui wallet is your key. No passwords, no accounts — just cryptographic ownership." color="#67e8f9" />
            <ValueCard icon={<Shield size={18} />} title="Tamper-Proof Proof" desc="Every file gets a SHA-256 hash anchored on Sui. Anyone can verify authenticity at any time." color="#f59e0b" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── USE CASES ────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
          style={{ maxWidth: 960, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 12 }}>
              Built for real people
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-2)' }}>Not just developers. Anyone who needs secure, verifiable documents.</p>
          </motion.div>
          <motion.div variants={fadeUp} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            <UsePill icon={<Briefcase size={14} />} label="Freelance Contracts" />
            <UsePill icon={<FileText size={14} />} label="Legal Agreements" />
            <UsePill icon={<Palette size={14} />} label="Creative Portfolios" />
            <UsePill icon={<Users size={14} />} label="Team Documents" />
            <UsePill icon={<Zap size={14} />} label="AI-Generated Reports" />
            <UsePill icon={<Globe size={14} />} label="IP & Ownership Proof" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── TECH STACK ───────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px' }}>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
          style={{ maxWidth: 960, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Powered by</div>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 900, letterSpacing: '-0.03em' }}>
              The best decentralized infrastructure
            </h2>
          </motion.div>
          <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <TechBadge name="Walrus" role="Permanent decentralized file storage" color="#a78bfa" />
            <TechBadge name="Seal" role="Browser-side encryption & privacy" color="#67e8f9" />
            <TechBadge name="Sui" role="Wallet identity & ownership proof" color="#10b981" />
            <TechBadge name="Tatum" role="Reliable blockchain RPC infrastructure" color="#f59e0b" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px 120px', textAlign: 'center' }}>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
          style={{ maxWidth: 560, margin: '0 auto' }}>
          <motion.div variants={fadeUp}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 16 }}>
              Your files. Your keys.{' '}
              <span style={{ background: 'linear-gradient(135deg, #a78bfa, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Forever.</span>
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-2)', marginBottom: 32, lineHeight: 1.65 }}>
              Connect your Sui wallet and start storing documents the world can trust.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/upload" className="btn btn-primary" style={{
                height: 52, paddingLeft: 28, paddingRight: 28, fontSize: 15, fontWeight: 700,
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                boxShadow: '0 4px 24px rgba(124,58,237,0.4)',
                display: 'inline-flex', alignItems: 'center', gap: 10, borderRadius: 999, textDecoration: 'none', color: '#fff',
              }}>
                <Upload size={16} /> Start Uploading
              </Link>
              <Link href="/verify" style={{
                height: 52, paddingLeft: 24, paddingRight: 24, fontSize: 14, fontWeight: 500,
                display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, textDecoration: 'none',
                color: 'var(--text-3)',
              }}>
                Or verify a document <ArrowRight size={14} />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </section>

    </main>
  );
}
