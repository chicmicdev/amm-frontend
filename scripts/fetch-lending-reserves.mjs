import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const BASE_SEPOLIA_RPC = 'https://sepolia.base.org';
const LENDING_POOL_ADDRESS = '0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27';

const LENDING_POOL_ABI = [
  {
    type: 'function',
    name: 'getReservesList',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address[]', name: '' }],
  },
];

const ERC20_ABI = [
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string', name: '' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8', name: '' }],
  },
];

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(BASE_SEPOLIA_RPC),
});

async function main() {
  console.log('Fetching lending reserve assets from Base Sepolia...');

  const reserves = await client.readContract({
    address: LENDING_POOL_ADDRESS,
    abi: LENDING_POOL_ABI,
    functionName: 'getReservesList',
  });

  const assets = await Promise.all(reserves.map(async asset => {
    const symbol = await client.readContract({
      address: asset,
      abi: ERC20_ABI,
      functionName: 'symbol',
    });

    const decimals = await client.readContract({
      address: asset,
      abi: ERC20_ABI,
      functionName: 'decimals',
    });

    return { asset, symbol, decimals };
  }));

  console.log('Reserve assets:');
  for (const item of assets) {
    console.log(`${item.symbol.padEnd(8)} ${item.asset} (${item.decimals} decimals)`);
  }
}

main().catch(error => {
  console.error('Error fetching reserve assets:', error);
  process.exit(1);
});
