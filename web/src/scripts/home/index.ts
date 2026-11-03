// Home page entry: every section module registers here, then the shared kit starts.
import { startKit } from '../motion/kit';
import { initHero } from './hero';
import { initAi } from './ai';
import { initPillars } from './pillars';
import { initBrand } from './brand';
import { initShowcase } from './showcase';
import { initProof } from './proof';

initHero();
initAi();
initPillars();
initBrand();
initShowcase();
initProof();
startKit();
