# Checkpoint — Work Memory on Walrus

> **[Total Recall | Tatum × Walrus Memory Hackathon](https://tatum.io/hackathon/total-recall) — Track 02: Smart Agents for Real Life**

Checkpoint is a **personal work-context agent** that remembers your sessions so you don't have to. Every time you log what you worked on, what blocked you, and what you decided — it's stored permanently on **Walrus Mainnet** and recalled by an **AI assistant** powered by Walrus Memory.

**Live Demo:** [checkpoint-app.vercel.app](https://checkpoint-app.vercel.app)
**Repo:** [github.com/zazadra/Checkpoint](https://github.com/zazadra/Checkpoint)

---

## The Problem

Developers lose hours re-establishing context every time they resume work after a break. "What was I doing? Where was I stuck? What did I decide?" — these questions cost real time and mental energy.

## The Solution

Checkpoint logs your sessions in a structured way (mood, current work, blockers, decisions, next steps) and stores them permanently on **Walrus Mainnet**. When you come back, an **AI assistant** (powered by Walrus Memory + Gemini) recalls your history and answers: *"What were you working on last week?"*

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Persistent Storage** | [Walrus Memory (MemWal)](https://memory.walrus.xyz) — mainnet, 10+ writes per session |
| **Onchain Data / Balance** | [Tatum RPC](https://tatum.io) — `suix_getBalance`, `suix_getOwnedObjects` |
| **Wallet Auth** | Sui + Slush Wallet via `@mysten/dapp-kit-react` |
| **AI Assistant** | Gemini 2.0 Flash + Walrus Memory recall |
| **Frontend** | Next.js 16, React 19, Tailwind v4, Framer Motion |
| **Blob Storage** | Walrus Mainnet (direct PUT to publisher) |

---

## Features

### 🧠 Session Memory
Log structured work sessions with:
- **Mood** (5 levels: 🔥 focused → 😤 frustrated)
- **Current Work** — what you're building
- **Blockers** — what's stopping you
- **Decisions** — what you decided
- **Next Steps** — where to resume

### 💡 Insight Engine
Automatically surfaces patterns from your history:
- Recurring themes (keyword extraction across sessions)
- Mood trends (happy / frustrated / overwhelmed)
- Stale session alert (≥2 days since last checkpoint)
- Top blocker frequency

### 🤖 Checkpoint AI (Walbot Integration)
Floating AI assistant (bottom-right) that:
- Recalls your full session history from **Walrus Memory**
- Answers questions: *"What was I stuck on?"*, *"Summarize last 5 sessions"*
- Learns new facts from conversations and saves them back to Walrus Memory
- Powered by Gemini 2.0 Flash + official `@mysten-incubation/memwal` SDK

### 💰 SUI Balance (Tatum RPC)
Real-time SUI wallet balance displayed on dashboard using Tatum's Sui Mainnet RPC gateway.

---

## Walrus Memory Integration

Each checkpoint write triggers **2 Walrus Memory operations**:
1. **Index write** — full project + all checkpoints index
2. **Entry write** — individual checkpoint entry

Each chat message with the AI triggers:
1. **Recall** — semantic search over past sessions
2. **Remember** — save new insights from the conversation

After 10 checkpoints + 10 AI conversations = **40+ Walrus Memory operations on Mainnet**.

---

## Getting Started

### Prerequisites
- Node.js 20+
- Slush Wallet browser extension
- Tatum API key (free at [dashboard.tatum.io](https://dashboard.tatum.io))
- Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))
- MemWal credentials (from [memory.walrus.xyz](https://memory.walrus.xyz))

### Setup

```bash
git clone https://github.com/zazadra/Checkpoint.git
cd Checkpoint
npm install
```

Create `.env.local`:
```env
NEXT_PUBLIC_TATUM_API_KEY=your_tatum_api_key
NEXT_PUBLIC_SUI_NETWORK=mainnet

GEMINI_API_KEY=your_gemini_api_key

MEMWAL_PRIVATE_KEY=your_delegate_private_key
MEMWAL_ACCOUNT_ID=0x_your_account_id
MEMWAL_SERVER_URL=https://relayer.memory.walrus.xyz
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Architecture

```
User (Sui Wallet)
    │
    ├── POST /api/checkpoint/memory  ──► Walrus Blob PUT (mainnet)
    │                                   In-memory cache (fast path)
    │
    ├── POST /api/chat               ──► Gemini 2.0 Flash
    │   └── recall/remember          ──► Walrus Memory (MemWal SDK)
    │
    └── POST /api/sui-rpc            ──► Tatum RPC Gateway
        └── suix_getBalance               (SUI balance display)
```

---

## Hackathon Requirements Checklist

- [x] **Walrus Memory on Mainnet** — 10+ writes per user session
- [x] **Tatum RPC integration** — SUI balance via Tatum gateway
- [x] **Sui wallet auth** — Slush Wallet via dApp Kit
- [x] **Working demo** — [checkpoint-app.vercel.app](https://checkpoint-app.vercel.app)
- [x] **Public repo** — [github.com/zazadra/Checkpoint](https://github.com/zazadra/Checkpoint)
- [ ] **Blog post** — coming soon

---

## License

MIT
