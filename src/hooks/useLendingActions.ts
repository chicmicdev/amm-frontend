import { useCallback, useState } from 'react';
import { parseUnits, formatUnits, createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { useWalletClient } from 'wagmi';
import { useAppKitAccount } from '@reown/appkit/react';
import { LENDING_CONTRACTS, INTEREST_RATE_MODE, REFERRAL_CODE, BASE_SEPOLIA_RPC, LENDING_CHAIN_ID } from '../config/lending';
import { LENDING_POOL_ABI, ERC20_ABI } from '../contracts/lendingAbis';

export type TxStatus = 'idle' | 'approving' | 'pending' | 'success' | 'error';

const readClient = createPublicClient({ chain: baseSepolia, transport: http(BASE_SEPOLIA_RPC) });

function parseError(e: unknown): string {
  const msg = [
    (e as { shortMessage?: string })?.shortMessage,
    (e as { details?: string })?.details,
    (e as { message?: string })?.message,
  ]
    .filter(Boolean)
    .join(' | ');

  if (/User rejected|User denied|denied transaction|rejected the request/i.test(msg)) {
    return 'Transaction rejected by user.';
  }
  if (/insufficient funds/i.test(msg)) {
    return 'Insufficient ETH for gas on Base Sepolia.';
  }
  if (/Internal JSON-RPC error|InternalRpcError|execution reverted/i.test(msg)) {
    return 'Supply reverted on-chain, but RPC hid the reason. Common causes: insufficient token balance, reserve supply cap reached, paused/frozen reserve, or wrong network/RPC.';
  }
  return msg;
}

export function useLendingActions() {
  const { data: walletClient } = useWalletClient();
  const { address } = useAppKitAccount();
  const [status, setStatus] = useState<TxStatus>('idle');
  const [error,  setError ] = useState<string | null>(null);

  const reset = useCallback(() => { setStatus('idle'); setError(null); }, []);

  const ensureCorrectChain = useCallback(() => {
    const walletChainId = walletClient?.chain?.id;
    if (walletChainId !== LENDING_CHAIN_ID) {
      throw new Error(`Wrong network. Please switch wallet to Base Sepolia (chain ${LENDING_CHAIN_ID}).`);
    }
  }, [walletClient]);

  const ensureApproval = useCallback(async (asset: `0x${string}`, amount: bigint) => {
    if (!walletClient || !address) throw new Error('Wallet not connected');
    ensureCorrectChain();
    const allowance = await readClient.readContract({
      address: asset, abi: ERC20_ABI,
      functionName: 'allowance',
      args: [address as `0x${string}`, LENDING_CONTRACTS.POOL],
    }) as bigint;
    if (allowance < amount) {
      setStatus('approving');
      const hash = await walletClient.writeContract({
        address: asset, abi: ERC20_ABI,
        functionName: 'approve',
        // Approve just enough for this operation (improves UX vs "Unlimited").
        args: [LENDING_CONTRACTS.POOL, amount],
      });
      await readClient.waitForTransactionReceipt({ hash });
    }
  }, [walletClient, address, ensureCorrectChain]);

  const supply = useCallback(async (asset: `0x${string}`, amount: string, decimals: number) => {
    if (!walletClient || !address) { setError('Wallet not connected'); return; }
    try {
      ensureCorrectChain();
      setStatus('pending'); setError(null);
      const parsed = parseUnits(amount, decimals);
      if (parsed <= 0n) throw new Error('Enter an amount greater than 0.');

      const walletBal = await readClient.readContract({
        address: asset,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      }) as bigint;
      if (walletBal < parsed) {
        throw new Error(
          `Insufficient token balance for this reserve. Balance: ${formatUnits(walletBal, decimals)} (token: ${asset}).`,
        );
      }

      await ensureApproval(asset, parsed);

      // Preflight simulation after approval gives a clearer failure before user signs tx.
      await readClient.simulateContract({
        address: LENDING_CONTRACTS.POOL,
        abi: LENDING_POOL_ABI,
        functionName: 'supply',
        args: [asset, parsed, address as `0x${string}`, REFERRAL_CODE],
        account: address as `0x${string}`,
      });

      setStatus('pending');
      const hash = await walletClient.writeContract({
        address: LENDING_CONTRACTS.POOL, abi: LENDING_POOL_ABI,
        functionName: 'supply',
        args: [asset, parsed, address as `0x${string}`, REFERRAL_CODE],
      });
      await readClient.waitForTransactionReceipt({ hash });
      setStatus('success');
    } catch (e) { setError(parseError(e)); setStatus('error'); }
  }, [walletClient, address, ensureApproval, ensureCorrectChain]);

  const borrow = useCallback(async (asset: `0x${string}`, amount: string, decimals: number) => {
    if (!walletClient || !address) { setError('Wallet not connected'); return; }
    try {
      ensureCorrectChain();
      setStatus('pending'); setError(null);
      const hash = await walletClient.writeContract({
        address: LENDING_CONTRACTS.POOL, abi: LENDING_POOL_ABI,
        functionName: 'borrow',
        args: [asset, parseUnits(amount, decimals), BigInt(INTEREST_RATE_MODE.VARIABLE), REFERRAL_CODE, address as `0x${string}`],
      });
      await readClient.waitForTransactionReceipt({ hash });
      setStatus('success');
    } catch (e) { setError(parseError(e)); setStatus('error'); }
  }, [walletClient, address, ensureCorrectChain]);

  const repay = useCallback(async (asset: `0x${string}`, amount: string, decimals: number) => {
    if (!walletClient || !address) { setError('Wallet not connected'); return; }
    try {
      ensureCorrectChain();
      setStatus('pending'); setError(null);
      const parsed = parseUnits(amount, decimals);
      await ensureApproval(asset, parsed);
      setStatus('pending');
      const hash = await walletClient.writeContract({
        address: LENDING_CONTRACTS.POOL, abi: LENDING_POOL_ABI,
        functionName: 'repay',
        args: [asset, parsed, BigInt(INTEREST_RATE_MODE.VARIABLE), address as `0x${string}`],
      });
      await readClient.waitForTransactionReceipt({ hash });
      setStatus('success');
    } catch (e) { setError(parseError(e)); setStatus('error'); }
  }, [walletClient, address, ensureApproval, ensureCorrectChain]);

  const withdraw = useCallback(async (asset: `0x${string}`, amount: string, decimals: number) => {
    if (!walletClient || !address) { setError('Wallet not connected'); return; }
    try {
      ensureCorrectChain();
      setStatus('pending'); setError(null);
      const hash = await walletClient.writeContract({
        address: LENDING_CONTRACTS.POOL, abi: LENDING_POOL_ABI,
        functionName: 'withdraw',
        args: [asset, parseUnits(amount, decimals), address as `0x${string}`],
      });
      await readClient.waitForTransactionReceipt({ hash });
      setStatus('success');
    } catch (e) { setError(parseError(e)); setStatus('error'); }
  }, [walletClient, address, ensureCorrectChain]);

  return { status, error, supply, borrow, repay, withdraw, reset };
}
