'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProofCapsule, CapsuleSigner, MemoryNode } from '@/lib/capsules';
import { Network, Cpu, User, FileText, Database, Shield } from 'lucide-react';

interface TrustGraphProps {
  capsule: ProofCapsule;
}

interface Node {
  id: string;
  type: 'capsule' | 'human' | 'agent' | 'memory';
  label: string;
  sublabel?: string;
  x: number;
  y: number;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  label: string;
  dashed?: boolean;
}

export function TrustGraph({ capsule }: TrustGraphProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Layout simulation (hardcoded specific positions for demo aesthetics)
    // Capsule is center
    const newNodes: Node[] = [
      { id: 'capsule', type: 'capsule', label: capsule.title, sublabel: capsule.type, x: 400, y: 200 }
    ];
    const newEdges: Edge[] = [];

    // Memory Lineage (Left side)
    const memories = capsule.memoryLineage || [];
    memories.forEach((mem, i) => {
      const yOffset = memories.length > 1 ? (i - (memories.length - 1)/2) * 80 : 0;
      newNodes.push({
        id: mem.id,
        type: 'memory',
        label: mem.label,
        sublabel: mem.type,
        x: 150,
        y: 200 + yOffset
      });
      newEdges.push({
        id: `edge-mem-${mem.id}`,
        source: mem.id,
        target: 'capsule',
        label: 'referenced by',
        dashed: true
      });
    });

    // Signers (Right side)
    const signers = capsule.signers;
    signers.forEach((s, i) => {
      const yOffset = signers.length > 1 ? (i - (signers.length - 1)/2) * 100 : 0;
      newNodes.push({
        id: s.address,
        type: s.role === 'ai-agent' ? 'agent' : 'human',
        label: s.name || s.address.substring(0,8),
        sublabel: s.role,
        x: 650,
        y: 200 + yOffset
      });
      newEdges.push({
        id: `edge-sig-${s.address}`,
        source: s.address,
        target: 'capsule',
        label: 'signed by',
        dashed: false
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
    setTimeout(() => setIsLoaded(true), 300);
  }, [capsule]);

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'capsule': return <Shield size={20} color="#10b981" />;
      case 'human': return <User size={16} color="#fbbf24" />;
      case 'agent': return <Cpu size={16} color="#a78bfa" />;
      case 'memory': return <Database size={16} color="#67e8f9" />;
      default: return <FileText size={16} color="#94a3b8" />;
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'capsule': return '#10b981';
      case 'human': return '#fbbf24';
      case 'agent': return '#a78bfa';
      case 'memory': return '#67e8f9';
      default: return '#94a3b8';
    }
  };

  return (
    <div style={{
      width: '100%', height: 400, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)',
      borderRadius: 16, position: 'relative', overflow: 'hidden'
    }}>
      
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
        backgroundSize: '40px 40px', opacity: 0.2, pointerEvents: 'none'
      }} />

      {/* SVG Canvas for Edges */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <AnimatePresence>
          {isLoaded && edges.map(edge => {
            const source = nodes.find(n => n.id === edge.source);
            const target = nodes.find(n => n.id === edge.target);
            if (!source || !target) return null;

            const isHovered = hoveredNode === edge.source || hoveredNode === edge.target || hoveredNode === 'capsule';

            return (
              <motion.g key={edge.id} initial={{ opacity: 0 }} animate={{ opacity: isHovered ? 0.8 : 0.3 }} transition={{ duration: 0.3 }}>
                <path
                  d={`M ${source.x} ${source.y} C ${source.x + 100} ${source.y}, ${target.x - 100} ${target.y}, ${target.x} ${target.y}`}
                  fill="none"
                  stroke="var(--text-3)"
                  strokeWidth={isHovered ? 2 : 1}
                  strokeDasharray={edge.dashed ? "4,4" : "none"}
                />
                {/* Moving particle on edge */}
                {isHovered && (
                  <circle r="3" fill="#67e8f9">
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      path={`M ${source.x} ${source.y} C ${source.x + 100} ${source.y}, ${target.x - 100} ${target.y}, ${target.x} ${target.y}`}
                    />
                  </circle>
                )}
              </motion.g>
            );
          })}
        </AnimatePresence>
      </svg>

      {/* HTML Nodes */}
      <AnimatePresence>
        {isLoaded && nodes.map((node, i) => {
          const isHovered = hoveredNode === node.id;
          const isRelated = edges.some(e => (e.source === node.id && e.target === hoveredNode) || (e.target === node.id && e.source === hoveredNode));
          const opacity = hoveredNode ? (isHovered || isRelated ? 1 : 0.3) : 1;

          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, scale: 0, x: node.x, y: node.y }}
              animate={{ opacity, scale: 1, x: node.x, y: node.y }}
              transition={{ delay: i * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
              style={{
                position: 'absolute', transform: 'translate(-50%, -50%)',
                cursor: 'pointer', zIndex: isHovered ? 10 : 1
              }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <div style={{
                background: 'var(--bg-card)', border: `1px solid ${isHovered ? getNodeColor(node.type) : 'var(--border)'}`,
                padding: '10px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12,
                boxShadow: isHovered ? `0 0 20px ${getNodeColor(node.type)}30` : 'none',
                minWidth: 160, transition: 'all 0.2s', backdropFilter: 'blur(10px)'
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${getNodeColor(node.type)}15`
                }}>
                  {getNodeIcon(node.type)}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
                    {node.label}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
                    {node.sublabel}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', alignItems: 'center', gap: 6, opacity: 0.5 }}>
        <Network size={14} color="var(--text-2)" />
        <span style={{ fontSize: 10, color: 'var(--text-2)', fontFamily: 'var(--mono)' }}>TRUST GRAPH v1.0</span>
      </div>
    </div>
  );
}
