import { POOLS_API_BASE } from '../../config/poolsApi';

export interface IndexPoolRow {
  _id: string;
  poolAddress: string;
  createdAt: string;
  token0: string;
  token1: string;
  fee: string;
  tickSpacing: number;
  sqrtPriceX96: string;
  status?: number;
  updatedAt?: string;
  initializedAt?: string;
  creationBlockNumber?: string;
  initializationBlockNumber?: string;
}

export interface ListPoolsParams {
  skip: number;
  limit: number;
  sortKey: string;
  /** API uses `1` ascending, `-1` descending */
  sortDirection: 1 | -1;
}

export interface ListPoolsResult {
  pools: IndexPoolRow[];
  total: number;
}

interface ApiEnvelope {
  statusCode?: number;
  status?: boolean;
  data?: { pools?: IndexPoolRow[]; total?: number };
}

export async function listPoolsFromIndex(params: ListPoolsParams): Promise<ListPoolsResult> {
  const q = new URLSearchParams({
    skip: String(params.skip),
    limit: String(params.limit),
    sortKey: params.sortKey,
    sortDirection: String(params.sortDirection),
  });
  const res = await fetch(`${POOLS_API_BASE}/pools?${q.toString()}`, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Pools API ${res.status}: ${res.statusText}`);
  }
  const body = (await res.json()) as ApiEnvelope;
  const data = body.data;
  return {
    pools: Array.isArray(data?.pools) ? data!.pools! : [],
    total: typeof data?.total === 'number' ? data.total : 0,
  };
}
