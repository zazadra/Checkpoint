import { NextResponse } from 'next/server';

export async function GET() {
  // Return a mocked trust graph overview for the whole network
  return NextResponse.json({
    success: true,
    nodes: [
      { id: 'org-1', type: 'organization', label: 'OpenAI' },
      { id: 'agent-1', type: 'agent', label: 'GPT-4o Agent' },
      { id: 'human-1', type: 'human', label: 'alice.sui' },
      { id: 'capsule-1', type: 'capsule', label: 'Q4 Research' }
    ],
    edges: [
      { source: 'org-1', target: 'agent-1', label: 'developed' },
      { source: 'agent-1', target: 'capsule-1', label: 'co-signed' },
      { source: 'human-1', target: 'capsule-1', label: 'approved' }
    ],
    metadata: {
      totalNodes: 14502,
      totalEdges: 38910,
      networkHealth: 'optimal'
    }
  });
}
