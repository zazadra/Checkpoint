import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { capsuleId, agentId, reasoning, signature } = body;

    if (!capsuleId || !agentId || !signature) {
      return NextResponse.json({ error: 'capsuleId, agentId, and signature are required' }, { status: 400 });
    }

    // Simulate appending a signature and reasoning to a capsule
    return NextResponse.json({
      success: true,
      message: 'Agent signature successfully anchored to capsule.',
      event: {
        type: 'agent-signed',
        actor: agentId,
        actorRole: 'ai-agent',
        timestamp: Date.now(),
        reasoning: reasoning || 'Cryptographically signed via API'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
