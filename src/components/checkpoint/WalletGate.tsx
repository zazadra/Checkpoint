'use client';

import { motion } from 'framer-motion';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { dAppKit } from '@/app/dapp-kit';

export function WalletGate() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ maxWidth: 460 }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.15))',
            border: '1px solid rgba(124,58,237,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            margin: '0 auto 28px',
            boxShadow: '0 0 40px rgba(124,58,237,0.2)',
          }}
        >
          🧠
        </div>

        <h1
          className="heading gradient-text"
          style={{ fontSize: 36, fontWeight: 800, marginBottom: 12, lineHeight: 1.15 }}
        >
          Checkpoint
        </h1>

        <p style={{ color: 'var(--text-2)', fontSize: 16, lineHeight: 1.65, marginBottom: 10 }}>
          Your work context, stored permanently on{' '}
          <span style={{ color: '#34d399', fontWeight: 600 }}>Walrus Memory</span>.
          <br />
          Pick up exactly where you left off — every session.
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            justifyContent: 'center',
            marginBottom: 36,
            marginTop: 20,
          }}
        >
          {[
            '🗂 Projects that remember',
            '🔍 Insight engine',
            '⛓ Walrus Mainnet',
            '⚡ Tatum Sui RPC',
          ].map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)',
                color: 'var(--text-2)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <ConnectButton instance={dAppKit} />

        <p style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 16 }}>
          Connects to your Sui wallet. No personal data sent to any server.
        </p>
      </motion.div>
    </div>
  );
}
