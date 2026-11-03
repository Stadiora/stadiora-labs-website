// Copy for the home hero (round-4 Floodlight). EN is the prototype's text; ES is written for Latin American readers.
export interface HomeHeroCopy {
  eyebrow: string;
  /** The two fixed lines above the swapping word. */
  lead: [string, string];
  /** What assistive tech reads for the h1: one stable sentence, so the cycling word never changes under a reader. */
  title: string;
  /** Seven words, in order; they map to the hero1..hero7 photo blocks. */
  words: string[];
  sub: string;
  start: string;
  demo: string;
  note: string;
  ready: { label: string; status: string };
  live: string;
  demoData: string;
  /** One toast per word, same order as `words`. */
  toasts: { title: string; text: string }[];
  customers: { count: string; label: string; listLabel: string };
}

const en: HomeHeroCopy = {
  eyebrow: 'Training · Nutrition · Readiness · Messaging',
  lead: ['The coaching', 'platform for'],
  title: 'The coaching platform for coaches and teams',
  words: ['coaches', 'high school teams', 'soccer academies', 'track and field', 'gyms and studios', 'nutrition coaches', 'universities'],
  sub: 'Training, nutrition, readiness and messaging in one place, so athletes and their coaches see the full picture.',
  start: 'Start free',
  demo: 'Book a demo',
  note: 'Free for one coach and up to 10 athletes. No card needed.',
  ready: { label: 'Readiness', status: 'Ready to train' },
  live: 'Live',
  demoData: 'Demo data',
  toasts: [
    { title: 'Program sent', text: 'Sprint group · 18 athletes' },
    { title: 'Travel consent · Signed ✓', text: 'Girls’ soccer · Riverside (Demo)' },
    { title: 'New team post', text: 'Coach Ana · U16 squad' },
    { title: 'Jump test · 41.2 cm', text: 'Power Lab · best this month' },
    { title: 'Check-in', text: 'Slept 7 h 40 m · Mood: good' },
    { title: 'Lunch logged', text: '640 kcal · estimate' },
    { title: 'Weekly report ready', text: '6 teams · 8 coaches' },
  ],
  customers: { count: '500+', label: 'Customers and partners', listLabel: 'Customers and partners' },
};

const es: HomeHeroCopy = {
  eyebrow: 'Entrenamiento · Nutrición · Preparación · Mensajes',
  lead: ['La plataforma', 'de coaching para'],
  title: 'La plataforma de coaching para entrenadores y equipos',
  words: ['entrenadores', 'equipos escolares', 'academias de fútbol', 'equipos de atletismo', 'gimnasios y estudios', 'coaches de nutrición', 'universidades'],
  sub: 'Entrenamiento, nutrición, preparación y mensajes en un solo lugar, para que los atletas y sus entrenadores vean el panorama completo.',
  start: 'Empieza gratis',
  demo: 'Agenda una demo',
  note: 'Gratis para un coach y hasta 10 atletas. Sin tarjeta.',
  ready: { label: 'Preparación', status: 'Listo para entrenar' },
  live: 'En vivo',
  demoData: 'Datos de ejemplo',
  toasts: [
    { title: 'Programa enviado', text: 'Grupo de velocidad · 18 atletas' },
    { title: 'Permiso de viaje · Firmado ✓', text: 'Fútbol femenino · Riverside (Demo)' },
    { title: 'Nueva publicación del equipo', text: 'Coach Ana · equipo sub-16' },
    { title: 'Prueba de salto · 41.2 cm', text: 'Power Lab · lo mejor del mes' },
    { title: 'Check-in', text: 'Durmió 7 h 40 min · Ánimo: bien' },
    { title: 'Almuerzo registrado', text: '640 kcal · estimado' },
    { title: 'Reporte semanal listo', text: '6 equipos · 8 coaches' },
  ],
  customers: { count: '500+', label: 'Clientes y aliados', listLabel: 'Clientes y aliados' },
};

export const homeHero: { en: HomeHeroCopy; es: HomeHeroCopy } = { en, es };
