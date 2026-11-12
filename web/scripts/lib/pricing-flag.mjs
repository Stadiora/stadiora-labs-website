// The one switch for the pricing page lives in src/data/site.ts (SHOW_PRICING). The guards read it from there, so they follow the site.
// Node type-strips the .ts import, as it does for the price table.
import { SHOW_PRICING } from '../../src/data/site.ts';

export const showPricing = SHOW_PRICING;
export const hiddenNote = 'pricing hidden (SHOW_PRICING=false)';

/** Prints the skip note for a pricing guard that does not apply while the pricing page is hidden. */
export const skipNote = (what) => console.log(`${what}: ${hiddenNote}, skipped`);
