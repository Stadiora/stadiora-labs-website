// Copy for /platform/power-lab/ (DESIGN-2 section 3). Fictional demo data only.
// Honest by design: these are estimates from video, not force-plate measurements.
import type { Locale } from '../index';
import type { PageMeta } from './coach-common';

const en = {
  meta: {
    title: 'Power Lab: test jumps with your phone | Stadiora Labs',
    description: 'Film in slow motion, mark take-off and landing, and see jump height and flight time. Built for track and field and soccer.',
  } satisfies PageMeta,
  hero: {
    eyebrow: 'Power Lab and testing',
    title: 'Test jumps with the phone you already have.',
    emphasis: 'the phone you already have',
    sub: 'Film in slow motion, mark take-off and landing, and see the numbers.',
    secondary: 'How it works',
    photoAlt:
      'A teen soccer player at the peak of a countermovement jump in a school gym while a teammate kneels and films it with a phone.',
  },
  flow: {
    id: 'how',
    title: 'Three steps from jump to number.',
    steps: [
      { title: 'Film at 240 fps', line: 'Prop the phone low and steady. 120 fps works too.' },
      { title: 'Mark take-off and landing', line: 'Step frame by frame and tap where the feet leave and touch the floor.' },
      { title: 'See the result', line: 'Saved to the athlete’s history.' },
    ],
    camera: { pill: '240 fps', label: 'Camera view' },
    frames: { take: 'Take-off', land: 'Landing' },
    result: {
      title: 'Countermovement jump',
      metrics: [
        { value: 38.4, decimals: 1, unit: 'cm', label: 'Jump height' },
        { value: 560, decimals: 0, unit: 'ms', label: 'Flight time' },
      ],
      demo: 'Demo values',
    },
  },
  chart: {
    title: 'Countermovement jump · last 8 weeks',
    unit: 'cm',
    baseline: 'Baseline',
    above: 'Above baseline',
    weeks: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
    values: [34.2, 34.8, 33.9, 35.4, 36.1, 36.0, 37.2, 38.4],
    band: [34, 36.4] as [number, number],
    range: [30, 42] as [number, number],
    label: 'Jump height over 8 weeks in centimetres: 34.2, 34.8, 33.9, 35.4, 36.1, 36.0, 37.2, 38.4. The last value is above the athlete’s baseline.',
    line: 'Each athlete gets a baseline, so you can see real change, not a single good day.',
  },
  tests: {
    title: 'Jump tests you can run',
    items: [
      'Countermovement jump',
      'Squat jump',
      'Abalakov jump',
      'Drop jump',
      '15 repeated jumps',
      'Single-leg jump (left and right)',
    ],
    note: 'Drop and repeated jumps also show contact time and reactive strength (RSI). Single-leg tests show the left-right difference.',
  },
  honest: {
    text: 'Estimates from video, not a force plate. Use the same setup each time for the best trend.',
    sports: 'For track and field and soccer',
  },
  also: ['programs', 'readiness', 'teams'] as const,
};

export type PowerLabCopy = typeof en;

const es: PowerLabCopy = {
  meta: {
    title: 'Power Lab: prueba saltos con tu teléfono | Stadiora Labs',
    description:
      'Graba en cámara lenta, marca el despegue y el aterrizaje, y mira la altura del salto y el tiempo de vuelo. Hecho para atletismo y fútbol.',
  },
  hero: {
    eyebrow: 'Power Lab y pruebas',
    title: 'Prueba saltos con el teléfono que ya tienes.',
    emphasis: 'el teléfono que ya tienes',
    sub: 'Graba en cámara lenta, marca el despegue y el aterrizaje, y mira los números.',
    secondary: 'Cómo funciona',
    photoAlt:
      'Una futbolista adolescente en el punto más alto de un salto con contramovimiento en un gimnasio escolar mientras una compañera, arrodillada, lo graba con un teléfono.',
  },
  flow: {
    id: 'how',
    title: 'Tres pasos del salto al número.',
    steps: [
      { title: 'Graba a 240 fps', line: 'Apoya el teléfono bajo y firme. 120 fps también sirve.' },
      { title: 'Marca el despegue y el aterrizaje', line: 'Avanza cuadro por cuadro y toca donde los pies dejan y tocan el piso.' },
      { title: 'Mira el resultado', line: 'Se guarda en el historial del atleta.' },
    ],
    camera: { pill: '240 fps', label: 'Vista de la cámara' },
    frames: { take: 'Despegue', land: 'Aterrizaje' },
    result: {
      title: 'Salto con contramovimiento',
      metrics: [
        { value: 38.4, decimals: 1, unit: 'cm', label: 'Altura del salto' },
        { value: 560, decimals: 0, unit: 'ms', label: 'Tiempo de vuelo' },
      ],
      demo: 'Valores de ejemplo',
    },
  },
  chart: {
    title: 'Salto con contramovimiento · últimas 8 semanas',
    unit: 'cm',
    baseline: 'Línea base',
    above: 'Sobre la línea base',
    weeks: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'],
    values: [34.2, 34.8, 33.9, 35.4, 36.1, 36.0, 37.2, 38.4],
    band: [34, 36.4] as [number, number],
    range: [30, 42] as [number, number],
    label:
      'Altura del salto en centímetros durante 8 semanas: 34,2, 34,8, 33,9, 35,4, 36,1, 36,0, 37,2, 38,4. El último valor está sobre la línea base del atleta.',
    line: 'Cada atleta tiene una línea base, así ves un cambio real y no un solo buen día.',
  },
  tests: {
    title: 'Pruebas de salto que puedes hacer',
    items: [
      'Salto con contramovimiento',
      'Salto desde sentadilla',
      'Salto Abalakov',
      'Salto en caída',
      '15 saltos repetidos',
      'Salto a una pierna (izquierda y derecha)',
    ],
    note: 'Los saltos en caída y repetidos también muestran el tiempo de contacto y la fuerza reactiva (RSI). Las pruebas a una pierna muestran la diferencia entre izquierda y derecha.',
  },
  honest: {
    text: 'Estimados a partir de video, no de una plataforma de fuerza. Usa la misma configuración cada vez para ver mejor la tendencia.',
    sports: 'Para atletismo y fútbol',
  },
  also: ['programs', 'readiness', 'teams'] as const,
};

export const powerLabCopy: Record<Locale, PowerLabCopy> = { en, es };
