import { NextResponse } from 'next/server';
import { generateMockCapsules } from '@/lib/capsules';

const capsules = generateMockCapsules(10);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Try to find in mock, otherwise return a generated one with this ID
  let capsule = capsules.find(c => c.id === id);
  if (!capsule) {
    capsule = { ...capsules[0], id, title: `Fetched Capsule ${id}` };
  }

  return NextResponse.json({ 
    success: true,
    data: capsule 
  });
}
