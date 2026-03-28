import type { TxHistoryEntry, TxHistoryKind } from '../../types';

const STORAGE_KEY = 'flux-swap-tx-history-v1';
const MAX_PER_ACCOUNT = 80;

function loadAll(): Record<string, TxHistoryEntry[]> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, TxHistoryEntry[]>;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, TxHistoryEntry[]>) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota */
  }
}

export function recordTxHistory(
  account: string,
  payload: { hash: string; kind: TxHistoryKind; summary: string }
): void {
  const addr = account.toLowerCase();
  const data = loadAll();
  const list = data[addr] ?? [];
  const entry: TxHistoryEntry = {
    id: `${payload.hash}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    hash: payload.hash,
    kind: payload.kind,
    createdAt: Date.now(),
    summary: payload.summary,
  };
  data[addr] = [entry, ...list].slice(0, MAX_PER_ACCOUNT);
  saveAll(data);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('flux-swap-history'));
  }
}

export function getTxHistory(account: string): TxHistoryEntry[] {
  const addr = account.toLowerCase();
  return loadAll()[addr] ?? [];
}

export function clearTxHistory(account: string): void {
  const addr = account.toLowerCase();
  const data = loadAll();
  delete data[addr];
  saveAll(data);
}
