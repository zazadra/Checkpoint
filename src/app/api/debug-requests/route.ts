/**
 * Debug endpoint — returns raw SigningRequest data from chain.
 * Remove before production.
 */
import { NextResponse } from 'next/server';

const PKG = process.env.NEXT_PUBLIC_WALSIGN_PACKAGE_ID ?? '';
const TATUM_KEY = process.env.NEXT_PUBLIC_TATUM_API_KEY ?? '';

async function suiRpc(method: string, params: unknown[]) {
  const res = await fetch('https://sui-mainnet.gateway.tatum.io', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': TATUM_KEY },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  return json.result;
}

export async function GET() {
  try {
    // 1. Find all create_request transactions
    const txResp = await suiRpc('suix_queryTransactionBlocks', [
      {
        filter: { MoveFunction: { package: PKG, module: 'walsign', function: 'create_request' } },
        options: { showObjectChanges: true, showInput: true },
      },
      null,
      20,
      false,
    ]);

    const txCount = txResp?.data?.length ?? 0;

    // 2. Extract object IDs
    const objectIds: string[] = [];
    for (const tx of txResp?.data ?? []) {
      for (const change of tx.objectChanges ?? []) {
        if (
          change.type === 'created' &&
          typeof change.objectType === 'string' &&
          change.objectType.includes('::walsign::SigningRequest')
        ) {
          objectIds.push(change.objectId);
        }
      }
    }

    // 3. Fetch objects
    const objects: unknown[] = [];
    if (objectIds.length > 0) {
      const objResp = await suiRpc('sui_multiGetObjects', [
        objectIds,
        { showContent: true },
      ]);
      for (const obj of objResp ?? []) {
        if (obj?.data?.content?.dataType === 'moveObject') {
          const f = obj.data.content.fields;
          objects.push({
            objectId: obj.data.objectId,
            title: f.title,
            creator: f.creator,
            required_signers: f.required_signers,
            signed_by: f.signed_by,
            completed: f.completed,
            revoked: f.revoked,
            blob_id: f.blob_id,
          });
        }
      }
    }

    return NextResponse.json({
      pkg: PKG,
      tatumKeySet: !!TATUM_KEY,
      txCount,
      objectIds,
      objects,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
