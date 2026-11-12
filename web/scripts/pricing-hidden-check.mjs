// Standalone run of the hidden-pricing guard: `npm run verify:pricing-hidden`. DIST_DIR points it at another build.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyPricingHidden } from './lib/pricing-hidden-checks.mjs';

const dist = process.env.DIST_DIR ? `${resolve(process.env.DIST_DIR)}/` : fileURLToPath(new URL('../dist/', import.meta.url));
const errors = [];
verifyPricingHidden({ dist, fail: (msg) => errors.push(msg) });
if (errors.length) {
  console.error(`verify-pricing-hidden: ${errors.length} problem${errors.length === 1 ? '' : 's'}`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
