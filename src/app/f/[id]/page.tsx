'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Lock, Globe, FileText, Clock, Download,
  Copy, ExternalLink, Shield, AlertCircle, Loader2, Eye
} from 'lucide-react';
import Link from 'next/link';
import { readJsonFromWalrus, getWalrusBlobUrl, getWalrusScanUrl } from '@/lib/walrus';

interface StoredFile {
  name: string;
  size: number;
  type: string;
  sha256: string;
  blobId: string;
  metaBlobId: string;
  encryptionKey: string;
  isEncrypted: boolean;
  owner: string;
  uploadedAt: number;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}
function shorten(s: string, head = 8, tail = 6) {
  if (!s) return '';
  return s.length <= head + tail + 3 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
}

function MetaRow({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontFamily: mono ? 'var(--mono)' : 'inherit', color: color ?? 'var(--text-2)' }}>
          {shorten(value, 16, 8)}
        </span>
        <button onClick={copy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#10b981' : 'var(--text-3)', padding: 2, display: 'flex' }}>
          <Copy size={12} />
        </button>
      </div>
    </div>
  );
}

export default function FilePage() {
  const params = useParams();
  const id = params.id as string;
  const [meta, setMeta] = useState<StoredFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sharecopied, setShareCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const data = await readJsonFromWalrus<StoredFile>(id);
        setMeta(data);
      } catch (e: any) {
        setError('Could not load file metadata. The ID may be invalid.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const copyShareLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1800);
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
        <Loader2 size={28} className="anim-spin" style={{ color: 'var(--accent)', marginBottom: 16 }} />
        <div style={{ fontWeight: 600 }}>Loading from Walrus…</div>
        <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-3)', marginTop: 6 }}>{shorten(id)}</div>
      </div>
    );
  }

  if (error || !meta) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 24px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, maxWidth: 480 }}>
          <AlertCircle size={18} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>File Not Found</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{error}</div>
          </div>
        </div>
      </div>
    );
  }

  const uploadDate = new Date(meta.uploadedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <main style={{ minHeight: '100vh', padding: '120px 24px 80px', maxWidth: 640, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        {/* Status badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px',
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: 999, fontSize: 13, fontWeight: 700, color: '#10b981',
          }}>
            <CheckCircle2 size={14} />
            Permanently Stored on Walrus
          </div>
        </div>

        {/* File card */}
        <div style={{ background: 'rgba(7,12,26,0.9)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', marginBottom: 20 }}>
          {/* Header */}
          <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={22} color="#a78bfa" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {meta.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-3)' }}>
                <span>{formatBytes(meta.size)}</span>
                <span>·</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} /> {uploadDate}
                </span>
              </div>
            </div>
            {meta.isEncrypted ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 999, fontSize: 11, fontWeight: 700, color: '#a78bfa', flexShrink: 0 }}>
                <Lock size={11} /> Encrypted
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 999, fontSize: 11, fontWeight: 700, color: 'var(--text-3)', flexShrink: 0 }}>
                <Globe size={11} /> Public
              </div>
            )}
          </div>

          {/* Meta rows */}
          <div style={{ padding: '4px 28px 20px' }}>
            <MetaRow label="Walrus File ID" value={meta.blobId} mono color="#67e8f9" />
            <MetaRow label="SHA-256 Hash" value={meta.sha256} mono color="var(--text-2)" />
            <MetaRow label="Owner Wallet" value={meta.owner} mono />
          </div>
        </div>

        {/* Encryption info */}
        {meta.isEncrypted && (
          <div style={{ display: 'flex', gap: 12, padding: '16px 20px', background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 14, marginBottom: 20, alignItems: 'flex-start' }}>
            <Lock size={16} color="#a78bfa" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Sealed with Encryption</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
                This file was encrypted with Seal before upload. Only the owner's wallet can decrypt and access the original content.
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          {!meta.isEncrypted && (
            <a
              href={getWalrusBlobUrl(meta.blobId)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: '1 1 140px', height: 48, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                border: 'none', borderRadius: 12, cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 16px rgba(124,58,237,0.35)', textDecoration: 'none',
              }}>
              <Download size={16} /> Download
            </a>
          )}
          <button
            onClick={copyShareLink}
            style={{
              flex: '1 1 120px', height: 48, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
              borderRadius: 12, cursor: 'pointer', color: sharecopied ? '#10b981' : 'var(--text-2)', fontWeight: 600, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s',
            }}>
            <Copy size={15} /> {sharecopied ? 'Copied!' : 'Copy Link'}
          </button>
          <Link
            href={`/verify/${id}`}
            style={{
              flex: '1 1 120px', height: 48, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 12, cursor: 'pointer', color: '#10b981', fontWeight: 600, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none',
            }}>
            <Shield size={15} /> Verify
          </Link>
          <a
            href={getWalrusScanUrl(meta.blobId)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              height: 48, padding: '0 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
              borderRadius: 12, color: 'var(--text-3)', fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none',
            }}>
            <ExternalLink size={13} /> WalrusScan
          </a>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
          This file is permanently stored on{' '}
          <a href="https://walrus.xyz" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-2)', textDecoration: 'none', fontWeight: 600 }}>Walrus</a>
          {' '}decentralized storage. It cannot be deleted or altered.{' '}
          <Link href={`/verify/${id}`} style={{ color: 'var(--verify-2)', textDecoration: 'none', fontWeight: 600 }}>Verify authenticity →</Link>
        </p>

      </motion.div>
    </main>
  );
}
