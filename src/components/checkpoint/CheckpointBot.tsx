'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Send, Loader2 } from 'lucide-react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import ReactMarkdown from 'react-markdown';
import { useCheckpoints } from '@/hooks/useCheckpoints';

type Message = { role: 'user' | 'model'; content: string };

function buildCheckpointContext(checkpoints: ReturnType<typeof useCheckpoints>['checkpoints']): string {
  if (!checkpoints.length) return '';
  const recent = checkpoints.slice(0, 15).map(c =>
    `[${new Date(c.createdAt).toLocaleDateString()}] mood=${c.mood} work="${c.currentWork}"${
      c.blockers ? ` blockers="${c.blockers}"` : ''
    }${c.decisions ? ` decisions="${c.decisions}"` : ''}${
      c.nextSteps ? ` next="${c.nextSteps}"` : ''
    }`
  );
  return recent.join('\n');
}

export function CheckpointBot() {
  const account = useCurrentAccount();
  const { checkpoints } = useCheckpoints();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: "Hey! 👋 I'm your **Checkpoint AI**. I know your full work history from Walrus Memory.\n\nAsk me things like:\n- *\"What was I working on last week?\"*\n- *\"What are my recurring blockers?\"*\n- *\"Summarize my last 5 sessions\"*",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: account?.address ?? 'anonymous',
          messages: [...messages, userMsg],
          checkpointContext: buildCheckpointContext(checkpoints),
        }),
      });

      const data = await res.json();
      setMessages(prev => [
        ...prev,
        { role: 'model', content: data.reply || data.error || 'Something went wrong.' },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'model', content: 'Connection error. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Floating button ── */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 24px rgba(124,58,237,0.5)',
        }}
      >
        {isOpen ? <X size={20} color="#fff" /> : <Brain size={20} color="#fff" />}
      </motion.button>

      {/* ── Chat panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed', bottom: 88, right: 24, zIndex: 999,
              width: 360, height: 520,
              background: 'var(--card)',
              border: '1px solid rgba(124,58,237,0.3)',
              borderRadius: 18,
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(124,58,237,0.08)',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Brain size={16} color="#fff" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
                  Checkpoint AI
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
                  {checkpoints.length} sessions in memory · Walrus
                </p>
              </div>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '12px 14px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    maxWidth: '85%',
                    padding: '9px 12px',
                    borderRadius: msg.role === 'user'
                      ? '14px 14px 4px 14px'
                      : '14px 14px 14px 4px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #7c3aed, #4f46e5)'
                      : 'rgba(255,255,255,0.05)',
                    border: msg.role === 'model' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                    fontSize: 13,
                    color: 'var(--text-1)',
                    lineHeight: 1.5,
                  }}>
                    {msg.role === 'model' ? (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p style={{ margin: '0 0 6px' }}>{children}</p>,
                          ul: ({ children }) => <ul style={{ margin: '4px 0', paddingLeft: 16 }}>{children}</ul>,
                          li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
                          strong: ({ children }) => <strong style={{ color: '#a78bfa' }}>{children}</strong>,
                          code: ({ children }) => (
                            <code style={{ background: 'rgba(124,58,237,0.2)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>
                              {children}
                            </code>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px 14px 14px 4px',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <Loader2 size={14} color="#7c3aed" style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Recalling memory…</span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: '10px 12px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <input
                className="input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Ask about your sessions…"
                style={{ flex: 1, fontSize: 13, padding: '8px 12px' }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                style={{
                  width: 36, height: 36, borderRadius: 10, border: 'none',
                  background: input.trim() ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'rgba(255,255,255,0.08)',
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Send size={15} color={input.trim() ? '#fff' : 'var(--text-3)'} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
