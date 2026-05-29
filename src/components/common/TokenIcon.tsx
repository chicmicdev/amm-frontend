import type { Token } from '../../types';

const SIZE_CLASS: Record<'xs' | 'sm' | 'md' | 'lg', string> = {
  xs: 'h-[18px] w-[18px] min-h-[18px] min-w-[18px] text-[8px] leading-none',
  sm: 'h-[22px] w-[22px] min-h-[22px] min-w-[22px] text-[10px] leading-none',
  md: 'h-7 w-7 min-h-7 min-w-7 text-[10px] leading-none',
  lg: 'h-9 w-9 min-h-9 min-w-9 text-[13px] leading-none',
};

export type TokenIconSize = keyof typeof SIZE_CLASS;

interface Props {
  token: Pick<Token, 'symbol' | 'logoColor'>;
  size?: TokenIconSize;
  className?: string;
}

/**
 * Circular token glyph (first 3 chars of symbol). Background color is dynamic per token.
 */
export default function TokenIcon({ token, size = 'md', className = '' }: Props) {
  const label = token.symbol.slice(0, 3);
  return (
    <span
      className={`inline-flex p-2 shrink-0 items-center justify-center rounded-full font-bold text-white ${SIZE_CLASS[size]} ${className}`.trim()}
      style={{ backgroundColor: token.logoColor }}
      aria-hidden
    >
      {label}
    </span>
  );
}
