export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoColor: string;
}

export interface Pool {
  address: string;
  token0: Token;
  token1: Token;
  fee: number;
  sqrtPriceX96: string;
  tick: number;
  liquidity: string;
  price: number;
  tvl: number;
  volume24h: number;
  feesEarned24h: number;
}

export interface Position {
  tokenId: number;
  token0: Token;
  token1: Token;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  tokensOwed0: string;
  tokensOwed1: string;
  priceLower: number;
  priceUpper: number;
  currentPrice: number;
  inRange: boolean;
  amount0: number;
  amount1: number;
  unclaimedFees0: number;
  unclaimedFees1: number;
}

export interface SwapParams {
  tokenIn: Token;
  tokenOut: Token;
  fee: number;
  amountIn: string;
  slippage: number;
}

export interface SwapQuote {
  amountOut: string;
  amountOutMinimum: string;
  priceImpact: number;
  executionPrice: number;
  gasFee: string;
}

export interface MintParams {
  token0: Token;
  token1: Token;
  fee: number;
  tickLower: number;
  tickUpper: number;
  amount0Desired: string;
  amount1Desired: string;
}

export interface PoolStats {
  price: number;
  priceChange24h: number;
  tvl: number;
  volume24h: number;
  fees24h: number;
}

export type FEE_TIER = 500 | 3000 | 10000;

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface TransactionResult {
  hash: string;
  status: 'pending' | 'success' | 'failed';
}
