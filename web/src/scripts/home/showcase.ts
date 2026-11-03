import { initSwaps } from './showcase/swap';
import { initMosaic } from './showcase/mosaic';
import { initPlanner } from './showcase/planner';
import { initMeasure } from './showcase/measure';
import { initEngage } from './showcase/engage';
import { initScale } from './showcase/scale';
import { initApps } from './showcase/apps';

export function initShowcase() {
  initSwaps();
  initMosaic();
  initPlanner();
  initMeasure();
  initEngage();
  initScale();
  initApps();
}
