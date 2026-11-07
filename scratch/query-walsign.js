// node has native fetch

const PACKAGE_ID = '0x3031a6db8c90db5d3704916fa35a6a25c01333298ac8bc34190477dd264f81a0';
const RPC_URL = 'https://fullnode.mainnet.sui.io';

async function main() {
  console.log("Querying transaction blocks calling create_request...");
  const txResp = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'suix_queryTransactionBlocks',
      params: [
        {
          filter: {
            MoveFunction: {
              package: PACKAGE_ID,
              module: 'walsign',
              function: 'create_request',
            },
          },
          options: { showObjectChanges: true, showInput: true },
        },
        null,
        100,
        true,
      ]
    })
  }).then(r => r.json());

  if (txResp.error) {
    console.error("Error from RPC:", txResp.error);
    return;
  }

  const txs = txResp.result?.data ?? [];
  console.log(`Found ${txs.length} transactions.`);

  const objectIds = [];
  for (const tx of txs) {
    console.log(`Transaction digest: ${tx.digest}`);
    for (const change of tx.objectChanges ?? []) {
      if (
        change.type === 'created' &&
        typeof change.objectType === 'string' &&
        change.objectType.includes('::walsign::SigningRequest')
      ) {
        console.log(`  Created SigningRequest object: ${change.objectId}`);
        objectIds.push(change.objectId);
      }
    }
  }

  if (objectIds.length === 0) {
    console.log("No SigningRequest objects found.");
    return;
  }

  console.log("\nFetching details for the object IDs...");
  const objectsResp = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'sui_multiGetObjects',
      params: [
        objectIds,
        { showContent: true }
      ]
    })
  }).then(r => r.json());

  const objects = objectsResp.result ?? [];
  for (const obj of objects) {
    if (obj.data?.content?.fields) {
      const f = obj.data.content.fields;
      console.log(`Object ID: ${obj.data.objectId}`);
      console.log(`  Title: ${f.title}`);
      console.log(`  Blob ID: ${f.blob_id}`);
      console.log(`  Creator: ${f.creator}`);
      console.log(`  Required signers: ${JSON.stringify(f.required_signers)}`);
      console.log(`  Signed by: ${JSON.stringify(f.signed_by)}`);
      console.log(`  Created at: ${f.created_at}`);
      console.log(`  Completed: ${f.completed}, Revoked: ${f.revoked}`);
    } else {
      console.log(`Object ID: ${obj.data?.objectId} has no fields or error:`, obj.error);
    }
  }
}

main().catch(console.error);
