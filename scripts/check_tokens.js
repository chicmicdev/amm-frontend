import { createPublicClient, http } from 'viem';
import { polygonAmoy } from 'viem/chains';

const client = createPublicClient({
  chain: polygonAmoy,
  transport: http('https://rpc-amoy.polygon.technology'),
});

const targetTimestamp = Math.floor(Date.parse('2026-04-06T12:00:17.469Z') / 1000);
console.log('Target timestamp:', targetTimestamp);

async function main() {
  try {
    const latestBlock = await client.getBlock({ blockTag: 'latest' });
    const latestBlockNumber = latestBlock.number;
    console.log('Latest block:', latestBlockNumber.toString(), 'Timestamp:', latestBlock.timestamp.toString());

    let low = 0n;
    let high = latestBlockNumber;
    let resultBlock = 0n;

    while (low <= high) {
      const mid = (low + high) / 2n;
      try {
        const block = await client.getBlock({ blockNumber: mid });
        const ts = Number(block.timestamp);
        console.log(`Block ${mid}: ${new Date(ts * 1000).toISOString()} (${ts})`);

        if (ts >= targetTimestamp) {
          resultBlock = mid;
          high = mid - 1n; // Try to find an earlier block matching the timestamp
        } else {
          low = mid + 1n;
        }
      } catch (err) {
        console.error(`Error querying block ${mid}:`, err.message || err);
        // If there's an error, try searching higher
        low = mid + 1n;
      }
    }

    console.log('Found block number near target timestamp:', resultBlock.toString());
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
