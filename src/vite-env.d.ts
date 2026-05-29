/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional HTTPS RPC for Polygon Amoy (overrides viem default). */
  readonly VITE_POLYGON_AMOY_RPC?: string;
  /** Set to `true` to enable `[FluxSwap:…]` console logs in production builds. */
  readonly VITE_FLUX_SWAP_DEV_LOGS?: string;
  /** Base URL for the off-chain pools index API (no trailing slash). */
  readonly VITE_POOLS_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
