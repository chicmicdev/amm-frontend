export function formatNumber(value: number, decimals = 2): string {
  if (value === 0) return '0';
  if (value < 0.0001) return '<0.0001';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(decimals);
}

export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCompactUSD(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return formatUSD(value);
}

export function formatTokenAmount(amount: string | number, decimals = 4): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  if (num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  return num.toFixed(decimals);
}

export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatPercent(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function parseUnits(value: string, decimals = 18): bigint {
  if (!value || value === '' || value === '.') return 0n;
  const [whole, fraction = ''] = value.split('.');
  const fracPadded = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(fracPadded || '0');
}

export function formatUnits(value: bigint, decimals = 18): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  const fracStr = fraction.toString().padStart(decimals, '0').slice(0, 4);
  return `${whole}.${fracStr}`;
}

export function shortenTxHash(hash: string): string {
  if (!hash) return '';
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}
