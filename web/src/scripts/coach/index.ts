// Entry for the Platform "Coach" pages: the page modules register, then the shared motion kit starts.
// The kit is idempotent, so the home entry and this one can never double-start it.
import { startKit } from '../motion/kit';
import { initAi } from '../home/ai';

initAi();
startKit();
