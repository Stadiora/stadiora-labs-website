// Copy for the home "four pillars" section (round-4 Floodlight). EN and ES.
export interface HomePillarsCopy {
  eyebrow: string;
  title: [string, string];
  tablistLabel: string;
  learnMore: string;
  demoNote: string;
  items: { tab: string; text: string }[];
}

const en: HomePillarsCopy = {
  eyebrow: 'One platform',
  title: ['Four ways to coach.', 'One place to do it.'],
  tablistLabel: 'What you can coach',
  learnMore: 'Learn more',
  demoNote: 'Demo data: a fictional coach and team.',
  items: [
    { tab: 'Training programs', text: 'Plan a season, a block or a single session. Push it to one athlete or the whole team.' },
    { tab: 'Nutrition', text: 'Meal plans, macros and a food diary, plus meal photos athletes can log in seconds.' },
    { tab: 'Readiness and wellbeing', text: 'Sleep, steps, check-ins and mindfulness in one daily picture.' },
    { tab: 'Sport and team coaching', text: 'Rosters, team calendars and sport tools like Power Lab jump tests.' },
  ],
};

const es: HomePillarsCopy = {
  eyebrow: 'Una plataforma',
  title: ['Cuatro formas de entrenar.', 'Un solo lugar para hacerlo.'],
  tablistLabel: 'Lo que puedes entrenar',
  learnMore: 'Conoce más',
  demoNote: 'Datos de demostración: una entrenadora y un equipo ficticios.',
  items: [
    { tab: 'Programas de entrenamiento', text: 'Planifica una temporada, un bloque o una sola sesión. Envíala a un atleta o a todo el equipo.' },
    { tab: 'Nutrición', text: 'Planes de comidas, macros y un diario de alimentos, además de fotos de comidas que los atletas registran en segundos.' },
    { tab: 'Preparación y bienestar', text: 'Sueño, pasos, check-ins y mindfulness en una sola imagen diaria.' },
    { tab: 'Coaching deportivo y de equipos', text: 'Planteles, calendarios de equipo y herramientas por deporte, como las pruebas de salto de Power Lab.' },
  ],
};

export const homePillars: { en: HomePillarsCopy; es: HomePillarsCopy } = { en, es };
