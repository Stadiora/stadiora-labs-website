// Entry for the API page: the page modules register, then the shared motion kit starts. The kit is idempotent.
import { startKit } from '../motion/kit';
import { initEngine } from './engine';
import { initDataWall } from './datawall';
import { initRail } from './rail';
import { initCode } from './code';
import { initSports } from './sports';
import { initUseCases } from './usecases';
import { initStages } from './stages';

initEngine();
initDataWall();
initRail();
initCode();
initSports();
initUseCases();
startKit();
initStages();
