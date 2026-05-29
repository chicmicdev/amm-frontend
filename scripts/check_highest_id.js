import { createPublicClient, http } from 'viem';
import { polygonAmoy } from 'viem/chains';

const pc = createPublicClient({
  chain: polygonAmoy,
  transport: http()
});

const npmAddress = '0x26c03A3B131Ce8Cc590f97975C5197e5D8b7105b';

const abi = [{
  inputs: [{ name: "tokenId", type: "uint256" }],
  name: "ownerOf",
  outputs: [{ name: "", type: "address" }],
  stateMutability: "view",
  type: "function"
}];

async function getHighestTokenId() {
  let low = 1n;
  let high = 100000n; // Assume max 100k
  let highest = 0n;

  // First, find an upper bound if 100k exists
  while (true) {
    try {
      await pc.readContract({ address: npmAddress, abi, functionName: 'ownerOf', args: [high] });
      // If it succeeds, high needs to be higher
      low = high;
      high *= 2n;
    } catch (e) {
      break;
    }
  }

  // Binary search
  while (low <= high) {
    const mid = (low + high) / 2n;
    try {
      await pc.readContract({ address: npmAddress, abi, functionName: 'ownerOf', args: [mid] });
      highest = mid;
      low = mid + 1n;
    } catch (e) {
      high = mid - 1n;
    }
  }
  
  console.log("Highest token ID is:", highest.toString());
}

getHighestTokenId().catch(console.error);
