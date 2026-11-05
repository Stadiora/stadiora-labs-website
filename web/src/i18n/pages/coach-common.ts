// Copy shared by the four Platform "Coach" feature pages (programs, nutrition, readiness, power lab).
// Spanish omits the opening ¿ and ¡ marks, as in the rest of the site.
import type { Locale } from '../index';

const en = {
  startFree: 'Start free',
  also: 'Also in Aria',
  cta: { title: 'Ready when your season is.', coach: 'Start as a coach', call: 'Book a call' },
  stepWord: 'Step',
};

export type CoachCommon = typeof en;

const es: CoachCommon = {
  startFree: 'Empieza gratis',
  also: 'También en Aria',
  cta: { title: 'Listos cuando empiece tu temporada.', coach: 'Empieza como coach', call: 'Agenda una llamada' },
  stepWord: 'Paso',
};

export const coachCommon: Record<Locale, CoachCommon> = { en, es };

export interface PageMeta {
  title: string;
  description: string;
}
