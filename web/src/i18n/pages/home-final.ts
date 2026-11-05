// Copy for the home final reel section.
export interface HomeFinalCopy {
  /** Two display lines; the second one carries the gradient. */
  title: [string, string];
  lead: string;
  download: string;
  coach: string;
  call: string;
}

const en: HomeFinalCopy = {
  title: ['Ready when', 'your season is.'],
  lead: 'Start free with one coach and up to 10 athletes. No card needed.',
  download: 'Download the app',
  coach: 'Start as a coach',
  call: 'Book a call',
};

const es: HomeFinalCopy = {
  title: ['Listos cuando', 'empiece tu temporada.'],
  lead: 'Empieza gratis con un coach y hasta 10 atletas. Sin tarjeta.',
  download: 'Descarga la app',
  coach: 'Empieza como coach',
  call: 'Agenda una llamada',
};

export const homeFinal: { en: HomeFinalCopy; es: HomeFinalCopy } = { en, es };
