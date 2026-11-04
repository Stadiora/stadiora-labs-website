// Solutions, Resources and company pages entry: every module registers here, then the shared kit starts.
import { startKit } from '../motion/kit';
import { initSwap } from './swap';
import { initFeed } from './feed';
import { initMorph } from './morph';
import { initContact } from './contact';
import { initStages } from './stages';

initSwap();
initFeed();
initMorph();
initContact();
initStages();
startKit();
