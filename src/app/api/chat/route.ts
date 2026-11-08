/**
 * /api/chat — Checkpoint AI Memory Assistant
 *
 * Powered by Walbot-AI architecture:
 * - Recalls user's checkpoint history from MemWal (Walrus Memory)
 * - Answers questions about past work sessions
 * - Saves new insights back to MemWal
 * - Supports Gemini (primary) and Groq (fallback)
 */
import { NextRequest, NextResponse } from 'next/server';
import { memwalRecall, memwalRemember } from '@/lib/memwal/client';

export const runtime   = 'nodejs';
export const maxDuration = 30;

interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      userId?: string;
      messages?: ChatMessage[];
      checkpointContext?: string; // summary of user's projects injected from client
    };
    const { userId = 'anonymous', messages = [], checkpointContext = '' } = body;

    if (!messages.length) {
      return NextResponse.json({ error: 'Pesan kosong' }, { status: 400 });
    }

    const latestMessage = messages[messages.length - 1].content;

    // ── 1. Recall from MemWal ──────────────────────────────────────────
    const memoryQuery = `Checkpoint session, work context, blockers, decisions, mood. Query: ${latestMessage}`;
    const memoryContext = await memwalRecall(userId, memoryQuery, 8);

    // ── 2. Build System Prompt ─────────────────────────────────────────
    const systemInstruction = `You are **Checkpoint AI**, an intelligent work-context assistant built into the Checkpoint app — a personal session memory tool built on Walrus Memory (decentralized storage) and Sui blockchain.

Your sole purpose: help the user recall, understand, and act on their past work sessions stored in Walrus Memory.

## USER CONTEXT (live data from Walrus Memory)
Wallet: ${userId}

${checkpointContext ? `## CURRENT PROJECTS\n${checkpointContext}\n` : ''}

## RECALLED MEMORIES (from Walrus Memory via MemWal)
${memoryContext || 'No memories yet. User has not saved any checkpoints. Encourage them to log their first session.'}

## YOUR CAPABILITIES
- Answer "what was I working on?" → recall from memory above
- Identify patterns: "you've been blocked by auth issues 3 times this week"
- Suggest next steps based on past decisions
- Surface forgotten context: "last time you decided to use Prisma over Drizzle"
- Mood trend: "you've been frustrated this week — do you want to break down the blockers?"

## RULES
- Keep answers concise and actionable
- Use the memory above as ground truth — don't hallucinate sessions
- If asked about something not in memory, say so clearly
- Language: match user's language (Indonesian or English)
- At end of reply, silently save new insights: <memwal>key fact learned</memwal>`;

    // ── 3. Normalize message history ───────────────────────────────────
    const normalized: { role: string; content: string }[] = [];
    for (const msg of messages.slice(0, -1)) {
      if (!normalized.length && msg.role !== 'user') continue;
      const last = normalized[normalized.length - 1];
      if (last && last.role === msg.role) {
        last.content += '\n\n' + msg.content;
      } else {
        normalized.push({ role: msg.role, content: msg.content });
      }
    }
    normalized.push({ role: 'user', content: latestMessage });

    // ── 4. Call Gemini API ─────────────────────────────────────────────
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');

    const geminiMessages = normalized.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: geminiMessages,
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      throw new Error(`Gemini ${geminiRes.status}: ${err}`);
    }

    const data = await geminiRes.json();
    const rawReply: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // ── 5. Extract MemWal tags and clean reply ─────────────────────────
    const memwalTagRegex = /<memwal>([\s\S]*?)<\/memwal>/gi;
    const facts: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = memwalTagRegex.exec(rawReply)) !== null) {
      facts.push(match[1].trim());
    }
    const reply = rawReply.replace(/<memwal>[\s\S]*?<\/memwal>/gi, '').trim();

    // ── 6. Save facts to MemWal (async, non-blocking) ─────────────────
    for (const fact of facts) {
      if (fact) memwalRemember(userId, fact).catch(console.error);
    }

    return NextResponse.json({ reply });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Chat API]', msg);
    return NextResponse.json({ error: 'Failed to process message', detail: msg }, { status: 500 });
  }
}
