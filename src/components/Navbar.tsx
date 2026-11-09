'use client';
import { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { dAppKit } from '@/app/dapp-kit';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Menu, X, Zap } from 'lucide-react';

function shorten(a: string) { return `${a.slice(0, 6)}…${a.slice(-4)}`; }

export function Navbar() {
  const account = useCurrentAccount();
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const NAV_LINKS = [
    { href: '/checkpoint', label: 'Dashboard', icon: <Brain size={14} /> },
  ];

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
      backdropFilter: scrolled ? 'blur(28px) saturate(180%)' : 'blur(16px)',
      WebkitBackdropFilter: scrolled ? 'blur(28px) saturate(180%)' : 'blur(16px)',
      background: scrolled ? 'rgba(3, 5, 8, 0.92)' : 'rgba(3, 5, 8, 0.80)',
      transition: 'all 0.35s cubic-bezier(0.2, 0, 0, 1)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', gap: 8 }}>

        {/* ── Logo ── */}
        <Link href="/checkpoint" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginRight: 24, flexShrink: 0 }}>
          <motion.div
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 18px rgba(124,58,237,0.5)',
              flexShrink: 0,
            }}
          >
            <Brain size={16} style={{ color: '#fff' }} />
          </motion.div>
          <div>
            <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.04em', color: '#f4f7ff', fontFamily: "'Space Grotesk', sans-serif" }}>
              Check<span style={{ background: 'linear-gradient(135deg, #c4b5fd, #67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>point</span>
            </span>
          </div>
        </Link>

        {/* ── Nav Links ── */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }} className="hide-mobile">
          {NAV_LINKS.map(({ href, label, icon }) => (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 9, fontSize: 13,
              fontWeight: isActive(href) ? 700 : 500,
              color: isActive(href) ? 'var(--accent-2)' : 'var(--text-2)',
              textDecoration: 'none',
              background: isActive(href) ? 'rgba(124,58,237,0.10)' : 'transparent',
              border: `1px solid ${isActive(href) ? 'rgba(124,58,237,0.22)' : 'transparent'}`,
              transition: 'all 0.18s',
            }}>
              {icon} {label}
            </Link>
          ))}
        </nav>

        {/* ── Right ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>

          {/* Powered by badge */}
          <div className="hide-mobile" style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 20,
            background: 'rgba(124,58,237,0.08)',
            border: '1px solid rgba(124,58,237,0.2)',
            fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
          }}>
            <Zap size={10} color="#a78bfa" />
            Walrus · Tatum · Sui
          </div>

          {account ? (
            <>
              {/* Address chip */}
              <button
                onClick={() => { navigator.clipboard.writeText(account.address); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
                className="addr-chip hide-mobile"
              >
                <span className="addr-dot" style={{ background: '#a78bfa', boxShadow: '0 0 6px rgba(167,139,250,0.7)' }} />
                <span className="mono" style={{ fontSize: 11 }}>{shorten(account.address)}</span>
                {copied && <span style={{ fontSize: 10, color: 'var(--verify-2)', fontWeight: 700 }}>✓</span>}
              </button>

              {/* Disconnect */}
              <button
                onClick={() => dAppKit.disconnectWallet()}
                style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '6px 10px', cursor: 'pointer', transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--error)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
              >
                Disconnect
              </button>
            </>
          ) : (
            <ConnectButton instance={dAppKit} />
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="show-mobile"
            style={{ background: 'none', border: 'none', color: 'var(--text-1)', cursor: 'pointer', padding: 4, display: 'none' }}
            aria-label="Menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ── Mobile Menu ── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              borderTop: '1px solid var(--border)',
              background: 'rgba(3, 5, 8, 0.98)',
              backdropFilter: 'blur(32px)',
              padding: '12px 20px 20px',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}
          >
            {NAV_LINKS.map(({ href, label, icon }) => (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                color: isActive(href) ? 'var(--accent-2)' : 'var(--text-2)',
                textDecoration: 'none',
                background: isActive(href) ? 'rgba(124,58,237,0.10)' : 'transparent',
              }}>
                {icon} {label}
              </Link>
            ))}
            {!account && (
              <div style={{ marginTop: 8 }}>
                <ConnectButton instance={dAppKit} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
