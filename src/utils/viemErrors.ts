/** Flatten viem / wagmi error chains for matching user-facing copy. */
export function collectViemErrorText(err: unknown): string {
  const parts: string[] = [];
  let cur: unknown = err;
  for (let i = 0; i < 8 && cur; i++) {
    if (cur instanceof Error) parts.push(cur.message);
    if (typeof cur === 'object' && cur !== null) {
      const o = cur as Record<string, unknown>;
      for (const k of ['shortMessage', 'details', 'message'] as const) {
        if (typeof o[k] === 'string') parts.push(o[k] as string);
      }
    }
    cur = (cur as { cause?: unknown }).cause;
  }
  return parts.join(' ');
}
