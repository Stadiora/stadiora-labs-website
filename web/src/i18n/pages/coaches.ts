// Copy for /solutions/coaches/ (DESIGN-2.md section 9). EN and ES.
const en = {
  meta: {
    title: 'Aria for coaches | Stadiora Labs',
    description:
      'Plans, food, check-ins and chat in one place, so your time goes to coaching. Start free with {coaches} coach and up to {athletes} athletes, no card.',
  },
  eyebrow: 'For coaches',
  title: "Coach every athlete like they're your only one.",
  sub: 'Plans, food, check-ins and chat in one place, so your time goes to coaching.',
  day: {
    title: 'A day with Aria',
    steps: [
      { time: '7:00 am', title: "See who's ready" },
      { time: '4:00 pm', title: 'Adjust the session' },
      { time: '9:00 pm', title: 'Reply in one place' },
    ],
  },
  ready: {
    title: "Today's readiness",
    rows: [
      { name: 'Sofia R.', score: 82, state: 'ready' },
      { name: 'Mateo G.', score: 76, state: 'ready' },
      { name: 'Ana L.', score: 58, state: 'attention' },
      { name: 'Dev P.', score: 80, state: 'ready' },
    ],
    states: { ready: 'Ready', attention: 'Needs attention' },
  },
  session: {
    name: 'Tempo 6 × 200 m',
    meta: 'Aerobic power · Track',
    saved: 'Saved',
    group: 'Whole group',
    groupSets: '6 × 200 m',
    one: 'Sofia R.',
    oneSets: '4 × 200 m',
    note: 'Reduced volume today. Focus on form and recovery between reps.',
  },
  chat: {
    title: 'Messages',
    thread: 'Sofia R.',
    messages: [
      { from: 'athlete', time: '9:02 PM', text: 'My legs feel heavy after today. Should I still run tomorrow?' },
      { from: 'coach', time: '9:04 PM', text: "Good call checking in. Easy 20 minutes tomorrow, and we'll look at it together." },
    ],
  },
  tools: {
    title: 'Everything you coach with',
    items: [
      { id: 'programs', title: 'Programs and the AI program builder', text: 'Build a program in minutes. The AI drafts it, you decide what goes out.' },
      { id: 'nutrition', title: 'Nutrition', text: 'Food diaries and targets your athletes can follow, and you can read at a glance.' },
      { id: 'readiness', title: 'Readiness and wellbeing', text: 'Daily check-ins show who is ready and who needs a conversation.' },
      { id: 'messaging', title: 'Messaging', text: 'Talk to one athlete or the whole group, without switching apps.' },
    ],
    more: 'Learn more',
  },
  free: {
    lead: 'Start free:',
    text: ' {coaches} coach, up to {athletes} athletes, no card.',
    core: 'Core from {price}/mo for {athletes} athletes',
  },
};

export type CoachesCopy = typeof en;

const es: CoachesCopy = {
  meta: {
    title: 'Aria para entrenadores | Stadiora Labs',
    description:
      'Planes, comida, check-ins y chat en un solo lugar, para que tu tiempo sea para entrenar. Empieza gratis con {coaches} entrenador y hasta {athletes} atletas, sin tarjeta.',
  },
  eyebrow: 'Para entrenadores',
  title: 'Entrena a cada atleta como si fuera el único.',
  sub: 'Planes, comida, check-ins y chat en un solo lugar, para que tu tiempo sea para entrenar.',
  day: {
    title: 'Un día con Aria',
    steps: [
      { time: '7:00 a. m.', title: 'Mira quién está listo' },
      { time: '4:00 p. m.', title: 'Ajusta la sesión' },
      { time: '9:00 p. m.', title: 'Responde en un solo lugar' },
    ],
  },
  ready: {
    title: 'Preparación de hoy',
    rows: [
      { name: 'Sofía R.', score: 82, state: 'ready' },
      { name: 'Mateo G.', score: 76, state: 'ready' },
      { name: 'Ana L.', score: 58, state: 'attention' },
      { name: 'Dev P.', score: 80, state: 'ready' },
    ],
    states: { ready: 'Listo', attention: 'Requiere atención' },
  },
  session: {
    name: 'Tempo 6 × 200 m',
    meta: 'Potencia aeróbica · Pista',
    saved: 'Guardado',
    group: 'Todo el grupo',
    groupSets: '6 × 200 m',
    one: 'Sofía R.',
    oneSets: '4 × 200 m',
    note: 'Volumen reducido hoy. Enfócate en la técnica y en recuperar entre series.',
  },
  chat: {
    title: 'Mensajes',
    thread: 'Sofía R.',
    messages: [
      { from: 'athlete', time: '9:02 p. m.', text: 'Siento las piernas pesadas después de hoy. Corro mañana igual?' },
      { from: 'coach', time: '9:04 p. m.', text: 'Qué bueno que me avisas. Mañana 20 minutos suaves y lo vemos juntos.' },
    ],
  },
  tools: {
    title: 'Todo lo que usas para entrenar',
    items: [
      { id: 'programs', title: 'Programas y el creador de programas con IA', text: 'Arma un programa en minutos. La IA lo redacta, tú decides qué se envía.' },
      { id: 'nutrition', title: 'Nutrición', text: 'Diarios de comida y metas que tus atletas pueden seguir y tú puedes leer de un vistazo.' },
      { id: 'readiness', title: 'Preparación y bienestar', text: 'Los check-ins diarios muestran quién está listo y con quién conviene hablar.' },
      { id: 'messaging', title: 'Mensajes', text: 'Habla con un atleta o con todo el grupo, sin cambiar de app.' },
    ],
    more: 'Conoce más',
  },
  free: {
    lead: 'Empieza gratis:',
    text: ' {coaches} entrenador, hasta {athletes} atletas, sin tarjeta.',
    core: 'Core desde {price}/mes para {athletes} atletas',
  },
};

export const coaches = { en, es };
