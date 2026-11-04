// The first swap word, split into letters the same way scripts/solutions/swap.ts builds the later ones:
// the letter index k (of m) colours the word along cyan > mint > violet.
export interface WordPart {
  /** Index of the space before this part, or -1 for the first part. */
  sp: number;
  letters: { ch: string; k: number }[];
}

export function splitWord(word: string): { m: number; parts: WordPart[] } {
  let k = 0;
  const parts = word.split(' ').map((part, i) => {
    const sp = i > 0 ? k : -1;
    const letters = [...part].map((ch) => ({ ch, k: k++ }));
    return { sp, letters };
  });
  return { m: Math.max(k - 1, 1), parts };
}

/** The whole swap sentence once, for screen readers (the visible words are aria-hidden). */
export function swapSentence(lang: string, pre: string, words: string[], post: string): string {
  const list = new Intl.ListFormat(lang, { style: 'long', type: 'conjunction' }).format(words);
  return `${pre}${list}${post}`;
}
