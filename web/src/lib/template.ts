// Page copy holds words and {tokens}; the numbers come from src/data/prices.ts and are filled in here.
// No imports: the verify script loads this file directly.

export type Segment = { text: string } | { token: string };

const TOKEN = /\{(\w+)\}/g;

/** `'{a} per month'` -> `[{ token: 'a' }, { text: ' per month' }]`. */
export function segments(template: string): Segment[] {
  const out: Segment[] = [];
  let at = 0;
  for (const match of template.matchAll(TOKEN)) {
    if (match.index > at) out.push({ text: template.slice(at, match.index) });
    out.push({ token: match[1] });
    at = match.index + match[0].length;
  }
  if (at < template.length) out.push({ text: template.slice(at) });
  return out;
}

/** Every token name in a template, in order. */
export function tokensOf(template: string): string[] {
  return Array.from(template.matchAll(TOKEN), (m) => m[1]);
}

/** Replaces each {token}. An unknown token becomes empty, so a typo shows up in the evidence checks. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(TOKEN, (_, key: string) => values[key] ?? '');
}
