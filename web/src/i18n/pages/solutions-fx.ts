// Strings that only the Floodlight motion on the Solutions, Resources and company pages needs: the swapping
// words under the hero titles and the club stage heading. The page copy itself stays in schools.ts, coaches.ts,
// clubs.ts, athletes.ts, about.ts, contact.ts and caseStudies.ts. No digits for prices live here.
export interface SwapCopy {
  /** Text before the swapping word, with its trailing space. */
  pre: string;
  words: string[];
  /** Text after it, with its leading space where one is needed. */
  post: string;
}

export interface SolutionsFxCopy {
  swap: { schools: SwapCopy; coaches: SwapCopy };
  clubs: { stageLabel: string; stageTitle: string; stageLead: string; feedTitle: string; feedSub: string };
}

const en: SolutionsFxCopy = {
  swap: {
    schools: { pre: 'Built for ', words: ['Track and field', "Girls' soccer", 'Strength'], post: ' teams.' },
    coaches: { pre: 'Coaching ', words: ['sprints', 'strength', 'soccer'], post: '? Aria fits.' },
  },
  clubs: {
    stageLabel: 'The week at a glance',
    stageTitle: 'Fixtures, practices and who can play.',
    stageLead: 'Switch squads. Everything for the week stays in one place.',
    feedTitle: 'Team feed',
    feedSub: 'Coaches and families',
  },
};

const es: SolutionsFxCopy = {
  swap: {
    schools: { pre: 'Hecho para equipos de ', words: ['atletismo', 'fútbol femenino', 'fuerza'], post: '.' },
    coaches: { pre: 'Entrenas ', words: ['velocidad', 'fuerza', 'fútbol'], post: '? Aria encaja.' },
  },
  clubs: {
    stageLabel: 'La semana de un vistazo',
    stageTitle: 'Partidos, prácticas y quién puede jugar.',
    stageLead: 'Cambia de equipo. Todo lo de la semana queda en un solo lugar.',
    feedTitle: 'Feed del equipo',
    feedSub: 'Entrenadores y familias',
  },
};

export const solutionsFx: { en: SolutionsFxCopy; es: SolutionsFxCopy } = { en, es };
