'use client';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

interface VerificationOrbProps {
  status?: string;
  size?: number;
}

export function VerificationOrb({ status = 'verified', size = 120 }: VerificationOrbProps) {
  const isVerified = status === 'verified' || status === 'sealed';
  const isPending = status === 'pending';
  
  const outerColor = isVerified ? '#a78bfa' : isPending ? '#fbbf24' : '#f87171';
  const middleColor = isVerified ? '#10b981' : isPending ? '#fbbf24' : '#f87171';
  const innerColor = isVerified ? '#67e8f9' : isPending ? '#f59e0b' : '#ef4444';
  const coreColor = isVerified ? '#4c1d95' : isPending ? '#b45309' : '#7f1d1d';

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px solid ${outerColor}40`, borderTopColor: outerColor }}
      />
      <motion.div
        animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: `2px dashed ${middleColor}60` }}
      />
      <motion.div
        animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'absolute', inset: 20, borderRadius: '50%', border: `1px solid ${innerColor}40`, borderBottomColor: innerColor }}
      />
      <motion.div
        animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }} transition={{ duration: 3, repeat: Infinity }}
        style={{ width: size * 0.5, height: size * 0.5, borderRadius: '50%', background: `radial-gradient(circle, ${coreColor}, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 30px ${outerColor}60` }}
      >
        <Shield size={size * 0.25} color="#fff" />
      </motion.div>
      <motion.div
        animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'absolute', inset: -5 }}
      >
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: middleColor, boxShadow: `0 0 10px ${middleColor}`, margin: '0 auto' }} />
      </motion.div>
    </div>
  );
}
