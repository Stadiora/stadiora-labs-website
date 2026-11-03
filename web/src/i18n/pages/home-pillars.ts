// Copy for the home "four pillars" section (round-4 Floodlight). EN and ES.
// The clips behind it carry no text: every label and demo card is drawn from `scenes` as live HTML.
export interface PillarScenes {
  training: { head: string; title: string; rows: { day: string; name: string; reps: string }[]; send: string; sent: { title: string; sub: string }; coach: { name: string; sub: string } };
  nutrition: { snap: string; head: string; unit: string; macros: { name: string; value: string }[]; logged: { title: string; sub: string } };
  readiness: { head: string; status: string; sleepHead: string; sleepValue: string; moods: [string, string, string]; breathe: { title: string; sub: string } };
  team: { head: string; unit: string; best: string; rosterHead: string; ready: string; checkIn: string; match: { day: string; title: string; sub: string } };
}

export interface HomePillarsCopy {
  eyebrow: string;
  title: [string, string];
  tablistLabel: string;
  learnMore: string;
  demoNote: string;
  items: { tab: string; text: string }[];
  scenes: PillarScenes;
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
  scenes: {
    training: {
      head: 'Sprint group · Week 3',
      title: '400 m block',
      rows: [
        { day: 'MON', name: 'Acceleration', reps: '6×30 m' },
        { day: 'TUE', name: 'Tempo', reps: '6×200 m' },
        { day: 'THU', name: 'Speed endurance', reps: '3×300 m' },
        { day: 'SAT', name: 'Race model', reps: '2×350 m' },
      ],
      send: 'Send to group →',
      sent: { title: 'Program sent', sub: 'Sprint group · 18 athletes' },
      coach: { name: 'Coach Daniela', sub: 'Planning week 3' },
    },
    nutrition: {
      snap: 'Snap a meal',
      head: 'Lunch · Estimate',
      unit: 'KCAL',
      macros: [
        { name: 'Protein', value: '42 g' },
        { name: 'Carbs', value: '78 g' },
        { name: 'Fat', value: '16 g' },
      ],
      logged: { title: 'Logged · Lunch', sub: 'Shared with Coach Ana' },
    },
    readiness: {
      head: 'Readiness · today',
      status: 'Ready to train',
      sleepHead: 'Sleep · 7 nights',
      sleepValue: '7 h 40 m last night',
      moods: ['😴 Tired', '🙂 Good', '💪 Strong'],
      breathe: { title: 'Breathe', sub: '4 min · before practice' },
    },
    team: {
      head: 'Power Lab · Countermovement jump',
      unit: '.2 CM',
      best: '▲ Best this month',
      rosterHead: "Girls' soccer · today",
      ready: 'Ready',
      checkIn: 'Check in',
      match: { day: 'SAT', title: 'Match day · 10:00', sub: 'Team calendar · U16' },
    },
  },
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
  scenes: {
    training: {
      head: 'Grupo de velocidad · Semana 3',
      title: 'Bloque de 400 m',
      rows: [
        { day: 'LUN', name: 'Aceleración', reps: '6×30 m' },
        { day: 'MAR', name: 'Tempo', reps: '6×200 m' },
        { day: 'JUE', name: 'Resistencia a la velocidad', reps: '3×300 m' },
        { day: 'SÁB', name: 'Ritmo de competencia', reps: '2×350 m' },
      ],
      send: 'Enviar al grupo →',
      sent: { title: 'Programa enviado', sub: 'Grupo de velocidad · 18 atletas' },
      coach: { name: 'Coach Daniela', sub: 'Planificando la semana 3' },
    },
    nutrition: {
      snap: 'Fotografía tu comida',
      head: 'Almuerzo · Estimación',
      unit: 'KCAL',
      macros: [
        { name: 'Proteína', value: '42 g' },
        { name: 'Carbohidratos', value: '78 g' },
        { name: 'Grasas', value: '16 g' },
      ],
      logged: { title: 'Registrado · Almuerzo', sub: 'Compartido con Coach Ana' },
    },
    readiness: {
      head: 'Preparación · hoy',
      status: 'Todo listo para entrenar',
      sleepHead: 'Sueño · 7 noches',
      sleepValue: '7 h 40 min anoche',
      moods: ['😴 Con sueño', '🙂 Bien', '💪 Con fuerza'],
      breathe: { title: 'Respira', sub: '4 min · antes de entrenar' },
    },
    team: {
      head: 'Power Lab · Salto con contramovimiento',
      unit: ',2 CM',
      best: '▲ Mejor marca del mes',
      rosterHead: 'Fútbol femenino · hoy',
      ready: 'Lista',
      checkIn: 'Check-in',
      match: { day: 'SÁB', title: 'Día de partido · 10:00', sub: 'Calendario del equipo · Sub-16' },
    },
  },
};

export const homePillars: { en: HomePillarsCopy; es: HomePillarsCopy } = { en, es };
