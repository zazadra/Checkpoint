/**
 * WalSign 3.0 — Proof Capsule System
 *
 * A Proof Capsule is an immutable bundle containing:
 * - Files / artifacts
 * - AI outputs
 * - Multi-party approvals
 * - Cryptographic timestamps
 * - Memory lineage (what was used to generate this)
 * - Revision history
 *
 * Stored permanently on Walrus, verified on Sui.
 */

export type CapsuleType =
  | 'ai-output'
  | 'legal-agreement'
  | 'governance'
  | 'creative'
  | 'evidence'
  | 'developer'
  | 'enterprise';

export type CapsuleStatus = 'sealed' | 'pending' | 'verified' | 'contested';

export type SignerRole = 'creator' | 'human-approver' | 'ai-agent' | 'witness' | 'auditor';

export interface CapsuleSigner {
  address: string;
  name?: string;
  role: SignerRole;
  signedAt?: number;
  txDigest?: string;
  /** For AI agents: the model/agent identifier */
  agentId?: string;
  /** For AI agents: summary of reasoning attached to signature */
  reasoning?: string;
}

export interface MemoryNode {
  id: string;
  label: string;
  type: 'file' | 'artifact' | 'prompt' | 'model' | 'dataset';
  blobId?: string;
  description: string;
}

export interface ProofEvent {
  id: string;
  timestamp: number;
  type: 'created' | 'anchored' | 'signed' | 'agent-signed' | 'verified' | 'contested' | 'sealed';
  actor: string;
  actorRole: SignerRole;
  txDigest?: string;
  description: string;
}

export interface ProofCapsule {
  id: string;
  title: string;
  description: string;
  type: CapsuleType;
  status: CapsuleStatus;

  /** Walrus storage */
  blobId: string;
  blobSize?: number;

  /** Sui on-chain */
  objectId?: string;
  txDigest?: string;
  anchoredAt?: number;

  /** Cryptographic proof */
  sha256Hash: string;
  contentType?: string;

  /** Parties */
  creator: string;
  signers: CapsuleSigner[];

  /** AI provenance */
  aiGenerated?: boolean;
  modelId?: string;
  memoryLineage?: MemoryNode[];

  /** Timeline */
  events: ProofEvent[];
  createdAt: number;

  /** Tags */
  tags: string[];

  /** Encryption */
  isEncrypted?: boolean;
  allowedViewers?: string[];
}

/** ── Mock Capsule Generator ──────────────────────────────────────────── */

function mockHash(): string {
  const hex = '0123456789abcdef';
  return '0x' + Array.from({ length: 64 }, () => hex[Math.floor(Math.random() * 16)]).join('');
}

function mockAddr(): string {
  const hex = '0123456789abcdef';
  return '0x' + Array.from({ length: 40 }, () => hex[Math.floor(Math.random() * 16)]).join('');
}

function mockBlobId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 46 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function generateMockCapsules(count = 8): ProofCapsule[] {
  const types: CapsuleType[] = ['ai-output', 'legal-agreement', 'governance', 'creative', 'evidence', 'developer'];
  const statuses: CapsuleStatus[] = ['sealed', 'pending', 'verified', 'sealed', 'verified', 'sealed'];
  const titles = [
    'Q4 AI Research Summary',
    'Series A Term Sheet',
    'DAO Treasury Proposal #42',
    'Original Composition v1.0',
    'Security Audit Report',
    'API Integration Contract',
    'Governance Vote Record',
    'AI Agent Decision Log',
  ];

  return Array.from({ length: count }, (_, i) => {
    const now = Date.now();
    const createdAt = now - (i * 86400000 * 3);
    const type = types[i % types.length];
    const status = statuses[i % statuses.length];
    const creator = mockAddr();
    const aiGenerated = type === 'ai-output' || type === 'developer';

    const events: ProofEvent[] = [
      { id: `ev-${i}-0`, timestamp: createdAt, type: 'created', actor: creator, actorRole: 'creator', description: 'Capsule created and artifact uploaded to Walrus' },
      { id: `ev-${i}-1`, timestamp: createdAt + 3000, type: 'anchored', actor: creator, actorRole: 'creator', txDigest: mockHash(), description: 'SHA-256 hash anchored to Sui blockchain' },
    ];

    if (aiGenerated) {
      events.push({ id: `ev-${i}-2`, timestamp: createdAt + 8000, type: 'agent-signed', actor: 'gpt-4o-agent', actorRole: 'ai-agent', description: 'AI agent attached reasoning and signed output' });
    }
    if (status !== 'pending') {
      events.push({ id: `ev-${i}-3`, timestamp: createdAt + 60000, type: 'signed', actor: mockAddr(), actorRole: 'human-approver', txDigest: mockHash(), description: 'Human approver co-signed the capsule' });
    }
    if (status === 'sealed' || status === 'verified') {
      events.push({ id: `ev-${i}-4`, timestamp: createdAt + 120000, type: 'sealed', actor: 'system', actorRole: 'auditor', description: 'Capsule permanently sealed — immutable record created' });
    }

    const memoryLineage: MemoryNode[] | undefined = aiGenerated ? [
      { id: `mem-${i}-0`, label: 'Source Documents', type: 'file', description: 'Input files used to generate this artifact', blobId: mockBlobId() },
      { id: `mem-${i}-1`, label: 'GPT-4o Model', type: 'model', description: 'AI model that generated the output' },
      { id: `mem-${i}-2`, label: 'System Prompt v2.3', type: 'prompt', description: 'Versioned system prompt used for generation' },
    ] : undefined;

    return {
      id: `capsule-${i}`,
      title: titles[i % titles.length],
      description: `Immutable proof capsule — cryptographically sealed and permanently stored on Walrus.`,
      type,
      status,
      blobId: mockBlobId(),
      blobSize: Math.floor(Math.random() * 5000000) + 10000,
      objectId: mockAddr(),
      txDigest: mockHash(),
      anchoredAt: createdAt + 3000,
      sha256Hash: mockHash(),
      contentType: 'application/pdf',
      creator,
      signers: [
        { address: creator, role: 'creator', signedAt: createdAt, name: 'alice.sui' },
        ...(aiGenerated ? [{ address: 'gpt-4o-agent', role: 'ai-agent' as SignerRole, agentId: 'gpt-4o-2024-08', signedAt: createdAt + 8000, reasoning: 'Reviewed and validated the output against source material. All claims are substantiated by the attached evidence chain.' }] : []),
        ...(status !== 'pending' ? [{ address: mockAddr(), role: 'human-approver' as SignerRole, signedAt: createdAt + 60000, name: 'bob.sui' }] : []),
      ],
      aiGenerated,
      modelId: aiGenerated ? 'gpt-4o-2024-08' : undefined,
      memoryLineage,
      events,
      createdAt,
      tags: [type, status, aiGenerated ? 'ai-generated' : 'human'].filter(Boolean),
    };
  });
}

/** ── Type helpers ───────────────────────────────────────────────────── */

export function getCapsuleTypeConfig(type: CapsuleType) {
  const configs = {
    'ai-output':       { label: 'AI Output',    color: '#a78bfa', bg: 'rgba(124,58,237,0.1)',  border: 'rgba(124,58,237,0.2)',  icon: '🤖' },
    'legal-agreement': { label: 'Legal',         color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)',  icon: '⚖️' },
    'governance':      { label: 'Governance',    color: '#fbbf24', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)',  icon: '🏛️' },
    'creative':        { label: 'Creative',      color: '#67e8f9', bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.2)',   icon: '🎨' },
    'evidence':        { label: 'Evidence',      color: '#f87171', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)',   icon: '🔎' },
    'developer':       { label: 'Developer',     color: '#a78bfa', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.2)', icon: '💻' },
    'enterprise':      { label: 'Enterprise',    color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', icon: '🏢' },
  };
  return configs[type] ?? configs['enterprise'];
}

export function getCapsuleStatusConfig(status: CapsuleStatus) {
  const configs = {
    sealed:    { label: 'Sealed',    color: '#a78bfa', bg: 'rgba(124,58,237,0.1)',  border: 'rgba(124,58,237,0.2)' },
    pending:   { label: 'Pending',   color: '#fbbf24', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
    verified:  { label: 'Verified',  color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
    contested: { label: 'Contested', color: '#f87171', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)' },
  };
  return configs[status];
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}
