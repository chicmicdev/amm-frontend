import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useSwitchChain, useChainId } from 'wagmi';
import { LENDING_CHAIN_ID } from '../config/lending';
import {
  fetchLendingReserves,
  fetchUserAccountData,
  fetchATokenBalance,
  fetchDebtTokenBalance,
  fetchWalletTokenBalance,
  type ReserveInfo,
  type UserAccountData,
} from '../services/lending/lendingService';

import { calcNetAPY, fmt } from '../components/lending/lendingUtils';
import type { ActionMode, ModalState } from '../components/lending/lendingTypes';

import { StatsBar }       from '../components/lending/StatsBar';
import { YourSupplies }   from '../components/lending/YourSupplies';
import { YourBorrows }    from '../components/lending/YourBorrows';
import { AssetsToSupply } from '../components/lending/AssetsToSupply';
import { AssetsToBorrow } from '../components/lending/AssetsToBorrow';
import { ActionModal }    from '../components/lending/ActionModal';
import { RiskModal }      from '../components/lending/RiskModal';
import { Btn }            from '../components/lending/Btn';

/** Fetches supply / debt / wallet maps; used by the balance effect and manual refresh. */
async function fetchLendingBalanceMaps(
  addr: `0x${string}`,
  reserves: ReserveInfo[],
): Promise<{
  supplyBals: Record<string, string>;
  debtBals: Record<string, string>;
  walletBals: Record<string, string>;
} | null> {
  if (reserves.length === 0) return null;
  const [sBals, dBals, wBals] = await Promise.all([
    Promise.all(reserves.map(async r =>
      [r.asset, await fetchATokenBalance(r.aTokenAddress, addr, r.decimals).catch(() => '0')] as [string, string]
    )),
    Promise.all(reserves.map(async r =>
      [r.asset, await fetchDebtTokenBalance(r.variableDebtTokenAddress, addr, r.decimals).catch(() => '0')] as [string, string]
    )),
    Promise.all(reserves.map(async r =>
      [r.asset, await fetchWalletTokenBalance(r.asset, addr, r.decimals).catch(() => '0')] as [string, string]
    )),
  ]);
  return {
    supplyBals: Object.fromEntries(sBals),
    debtBals: Object.fromEntries(dBals),
    walletBals: Object.fromEntries(wBals),
  };
}

export default function LendingPage() {
  const { open }            = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { switchChain }     = useSwitchChain();
  const chainId             = useChainId();
  const isBaseSepolia       = chainId === LENDING_CHAIN_ID;

  const [reserves, setReserves]       = useState<ReserveInfo[]>([]);
  const [userData, setUserData]       = useState<UserAccountData | null>(null);
  const [loadingReserves, setLoading] = useState(true);
  const [supplyBals, setSupplyBals]   = useState<Record<string, string>>({});
  const [debtBals, setDebtBals]       = useState<Record<string, string>>({});
  const [walletBals, setWalletBals]   = useState<Record<string, string>>({});
  const [modal, setModal]             = useState<ModalState | null>(null);
  const [showRisk, setShowRisk]       = useState(false);

  // ── Fetch all reserves once (loading starts true; clear only when fetch settles) ──
  useEffect(() => {
    let cancelled = false;
    fetchLendingReserves()
      .then(data => {
        if (!cancelled) setReserves(data);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // ── Refresh user account summary ────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    if (!address || !isBaseSepolia) return;
    try {
      setUserData(await fetchUserAccountData(address as `0x${string}`));
    } catch (e) { console.error(e); }
  }, [address, isBaseSepolia]);

  useEffect(() => {
    if (!address || !isBaseSepolia) return;
    let cancelled = false;
    const addr = address as `0x${string}`;
    void fetchUserAccountData(addr)
      .then(data => { if (!cancelled) setUserData(data); })
      .catch(e => { console.error(e); });
    return () => { cancelled = true; };
  }, [address, isBaseSepolia]);

  // ── Refresh all token balances ──────────────────────────────────────────────
  const refreshBalances = useCallback(async () => {
    if (!address || !isBaseSepolia || reserves.length === 0) return;
    try {
      const maps = await fetchLendingBalanceMaps(address as `0x${string}`, reserves);
      if (!maps) return;
      setSupplyBals(maps.supplyBals);
      setDebtBals(maps.debtBals);
      setWalletBals(maps.walletBals);
    } catch (e) { console.error(e); }
  }, [address, isBaseSepolia, reserves]);

  useEffect(() => {
    if (!address || !isBaseSepolia || reserves.length === 0) return;
    let cancelled = false;
    const addr = address as `0x${string}`;
    void fetchLendingBalanceMaps(addr, reserves)
      .then(maps => {
        if (cancelled || !maps) return;
        setSupplyBals(maps.supplyBals);
        setDebtBals(maps.debtBals);
        setWalletBals(maps.walletBals);
      })
      .catch(e => { console.error(e); });
    return () => { cancelled = true; };
  }, [address, isBaseSepolia, reserves]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const netWorth = userData
    ? fmt(parseFloat(userData.totalCollateralUSD) - parseFloat(userData.totalDebtUSD), 2)
    : '—';

  const netAPY = reserves.length > 0
    ? calcNetAPY(reserves, supplyBals, debtBals)
    : '0.00';

  const openModal = (reserve: ReserveInfo, mode: ActionMode) =>
    setModal({ reserve, mode });

  const handleSuccess = () => {
    void refreshUser();
    void refreshBalances();
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 80 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>

        {/* ── Page title ──────────────────────────────────────────── */}
        <div style={{ paddingTop: 40, paddingBottom: 20 }}>
          <motion.h1
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}
          >
            Base Market
          </motion.h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Lending · Base Sepolia Testnet
          </div>
        </div>

        {/* ── Stats bar ───────────────────────────────────────────── */}
        {isConnected && isBaseSepolia && userData && (
          <StatsBar
            userData={userData}
            netWorth={netWorth}
            netAPY={netAPY}
            onRiskDetails={() => setShowRisk(true)}
          />
        )}

        {/* ── Wrong network banner ─────────────────────────────────── */}
        <AnimatePresence>
          {isConnected && !isBaseSepolia && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'rgba(248,159,26,0.08)', border: '1px solid rgba(248,159,26,0.3)',
                borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 24, gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: '#F89F1A', marginBottom: 3 }}>⚠ Wrong Network</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Switch to <strong>Base Sepolia</strong> (chain 84532) to use this market.
                </div>
              </div>
              <Btn label="Switch Network" color="#F89F1A" onClick={() => switchChain({ chainId: LENDING_CHAIN_ID })} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Connect prompt ──────────────────────────────────────── */}
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '40px 24px', textAlign: 'center', marginBottom: 28,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 8 }}>
              Connect your wallet
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 22 }}>
              Connect to view positions and use the lending market
            </div>
            <Btn label="Connect Wallet" color="var(--color-accent)" onClick={() => open()} />
          </motion.div>
        )}

        {/* ── Loading state ────────────────────────────────────────── */}
        {loadingReserves && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
              Loading markets…
            </motion.div>
          </div>
        )}

        {/* ── Market content ───────────────────────────────────────── */}
        {!loadingReserves && reserves.length > 0 && (
          <>
            {/* Row 1 — User positions (only when connected + correct chain) */}
            {isConnected && isBaseSepolia && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 4 }}>
                <YourSupplies
                  reserves={reserves}
                  balances={supplyBals}
                  userData={userData}
                  onAction={openModal}
                />
                <YourBorrows
                  reserves={reserves}
                  debtBals={debtBals}
                  userData={userData}
                  onAction={openModal}
                />
              </div>
            )}

            {/* Row 2 — Available markets */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <AssetsToSupply
                reserves={reserves}
                walletBals={walletBals}
                onAction={openModal}
              />
              <AssetsToBorrow
                reserves={reserves}
                userData={userData}
                onAction={openModal}
              />
            </div>
          </>
        )}

        {!loadingReserves && reserves.length === 0 && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '40px 24px', textAlign: 'center',
            color: 'var(--text-muted)', fontSize: 14,
          }}>
            No markets found. Make sure you're on Base Sepolia.
          </div>
        )}
      </div>

      {/* ── Action Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {modal && (
          <ActionModal
            key={`${modal.reserve.asset}-${modal.mode}`}
            reserve={modal.reserve}
            mode={modal.mode}
            userAddress={address ?? ''}
            onClose={() => setModal(null)}
            onSuccess={handleSuccess}
          />
        )}
      </AnimatePresence>

      {/* ── Risk Details Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {showRisk && userData && (
          <RiskModal userData={userData} onClose={() => setShowRisk(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
