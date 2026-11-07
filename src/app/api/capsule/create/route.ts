import { NextResponse } from 'next/server';
import { generateMockCapsules } from '@/lib/capsules';

// Mock database
const capsules = generateMockCapsules(10);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, type, aiGenerated, memoryLineage } = body;

    if (!title || !type) {
      return NextResponse.json({ error: 'Title and type are required' }, { status: 400 });
    }

    // Simulate cryptographic anchoring and Walrus upload
    const newId = `capsule-${Date.now()}`;
    const blobId = 'mock_blob_' + Math.random().toString(36).substring(2, 15);
    const txDigest = '0x' + Math.random().toString(36).substring(2, 42);
    const sha256Hash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const newCapsule = {
      id: newId,
      title,
      description: description || '',
      type,
      status: 'pending',
      blobId,
      blobSize: 1024,
      objectId: '0xmock',
      txDigest,
      anchoredAt: Date.now(),
      sha256Hash,
      creator: 'api-user',
      signers: [{ address: 'api-user', role: 'creator', signedAt: Date.now() }],
      aiGenerated: !!aiGenerated,
      memoryLineage: memoryLineage || [],
      events: [{
        id: `ev-${newId}`,
        timestamp: Date.now(),
        type: 'created',
        actor: 'api-user',
        actorRole: 'creator',
        description: 'Capsule created via API'
      }],
      createdAt: Date.now(),
      tags: [type],
    };

    return NextResponse.json({ 
      success: true, 
      capsuleId: newId, 
      blobId,
      verificationUrl: `https://walsign.io/verify/${blobId}`,
      capsuleUrl: `https://walsign.io/capsule/${newId}`,
      data: newCapsule
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
