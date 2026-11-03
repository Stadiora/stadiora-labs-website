// Entry for the Platform "Coach" pages: the page modules register, then the shared motion kit starts.
// The kit is idempotent, so the home entry and this one can never double-start it.
import { startKit } from '../motion/kit';
import { initAi } from '../home/ai';

initAi();
startKit();

// The kit pauses CSS loops that are off screen; a hidden tab pauses them too, through one class on the root.
const syncHidden = () => document.documentElement.classList.toggle('cf-tab-hidden', document.hidden);
document.addEventListener('visibilitychange', syncHidden);
syncHidden();
