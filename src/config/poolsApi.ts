/** Base URL for the off-chain pools index (no trailing slash). */
export const POOLS_API_BASE =
  (import.meta.env.VITE_POOLS_API_BASE as string | undefined)?.replace(/\/$/, '')
  ?? 'http://192.180.3.86:3000';
