// Copy for /solutions/teams-and-clubs/ (DESIGN-2.md section 10, DECISIONS #13 and #14). EN and ES.
// The squad data is fictional. Availability words match the app: available, doubtful, unavailable.
const en = {
  meta: {
    title: 'Teams, clubs and academies | Stadiora Labs',
    description:
      'Fixtures, practice plans, player check-ins and family updates, for every age group. Soccer first, track and field too. Priced by athletes, not by squads.',
  },
  eyebrow: 'Teams, clubs and academies',
  title: 'Every squad on the same page.',
  sub: 'Fixtures, practice plans, player check-ins and family updates, for every age group.',
  week: {
    tabsLabel: 'Age group',
    range: 'Oct 12 – Oct 18',
    title: 'Week of Oct 12',
    fixture: 'Next fixture',
    practices: 'Practices',
    practice: 'Practice',
    availability: 'Availability',
    announcement: 'Announcement',
    powerLab: 'Power Lab',
    metric: 'Countermovement jump',
    metricNote: 'squad average',
    unit: 'cm',
    dates: ['Sep 21', 'Sep 28', 'Oct 5', 'Oct 12'],
    states: { available: 'available', doubtful: 'doubtful', unavailable: 'unavailable' },
    read: 'read',
    of: 'of',
    chartLabel: 'Squad average countermovement jump, from {first} cm on Sep 21 to {last} cm on Oct 12',
  },
  squads: [
    { id: 'u12', label: 'U12', fixture: { day: 'Sat', opponent: 'Rovers', time: '9:00 am', venue: 'Away' }, practices: [{ day: 'Mon', time: '4:30 pm' }, { day: 'Wed', time: '4:30 pm' }], available: 15, doubtful: 2, unavailable: 1, note: 'Photo day Saturday', read: 14, total: 18, cmj: [32, 33, 35, 36] },
    { id: 'u14', label: 'U14', fixture: { day: 'Sat', opponent: 'Athletic', time: '11:00 am', venue: 'Home' }, practices: [{ day: 'Tue', time: '5:00 pm' }, { day: 'Thu', time: '5:00 pm' }], available: 17, doubtful: 2, unavailable: 1, note: 'Bring both kits Saturday', read: 17, total: 20, cmj: [36, 37, 39, 40] },
    { id: 'u16', label: 'U16', fixture: { day: 'Sat', opponent: 'United', time: '10:00 am', venue: 'Home' }, practices: [{ day: 'Tue', time: '5:00 pm' }, { day: 'Thu', time: '5:00 pm' }], available: 18, doubtful: 3, unavailable: 1, note: 'Kit check Friday', read: 20, total: 22, cmj: [39, 41, 40, 43] },
    { id: 'first', label: 'First team', fixture: { day: 'Sun', opponent: 'City', time: '3:00 pm', venue: 'Away' }, practices: [{ day: 'Mon', time: '6:30 pm' }, { day: 'Wed', time: '6:30 pm' }, { day: 'Fri', time: '6:30 pm' }], available: 21, doubtful: 2, unavailable: 1, note: 'Travel plan for Sunday', read: 23, total: 24, cmj: [42, 43, 45, 46] },
  ],
  defaultSquad: 'u16',
  focus: 'Soccer first. Track and field too.',
  cols: [
    { title: 'Coaches', text: "Set the week's fixtures and practices, and see who is available before game day." },
    { title: 'Players', text: "Players join through their coach's invite in the athlete app and check in each day.", soon: { name: 'Aria 12', tag: 'Coming soon', text: 'our soccer app' } },
    { title: 'Families', text: 'Aria for Families keeps guardians in the loop. Included in Core and Performance.' },
  ],
  price: { text: 'Priced by athletes, not by squads. Core from {price}/mo.', quote: 'Priced by athletes, not by squads. Talk to us for a quote.', link: 'See pricing' },
  ask: "Ask us about your club's setup",
  cta: { primary: 'Book a call', secondary: 'Start free' },
};

export type ClubsCopy = typeof en;

const es: ClubsCopy = {
  meta: {
    title: 'Equipos, clubes y academias | Stadiora Labs',
    description:
      'Partidos, planes de práctica, check-ins de los jugadores y avisos para las familias, para cada categoría. Primero fútbol, y también atletismo. Precio por atleta, no por equipo.',
  },
  eyebrow: 'Equipos, clubes y academias',
  title: 'Cada equipo en la misma página.',
  sub: 'Partidos, planes de práctica, check-ins de los jugadores y avisos para las familias, para cada categoría.',
  week: {
    tabsLabel: 'Categoría',
    range: '12 oct – 18 oct',
    title: 'Semana del 12 de oct',
    fixture: 'Próximo partido',
    practices: 'Prácticas',
    practice: 'Práctica',
    availability: 'Disponibilidad',
    announcement: 'Aviso',
    powerLab: 'Power Lab',
    metric: 'Salto con contramovimiento',
    metricNote: 'promedio del equipo',
    unit: 'cm',
    dates: ['21 sep', '28 sep', '5 oct', '12 oct'],
    states: { available: 'disponibles', doubtful: 'en duda', unavailable: 'no disponibles' },
    read: 'leído',
    of: 'de',
    chartLabel: 'Promedio del equipo en salto con contramovimiento, de {first} cm el 21 de sep a {last} cm el 12 de oct',
  },
  squads: [
    { id: 'u12', label: 'U12', fixture: { day: 'Sáb',     opponent: 'Rovers', time: '9:00 a. m.', venue: 'Visita' }, practices: [{ day: 'Lun', time: '4:30 p. m.' }, { day: 'Mié', time: '4:30 p. m.' }], available: 15, doubtful: 2, unavailable: 1, note: 'Día de fotos el sábado', read: 14, total: 18, cmj: [32, 33, 35, 36] },
    { id: 'u14', label: 'U14', fixture: { day: 'Sáb',     opponent: 'Athletic', time: '11:00 a. m.', venue: 'Local' }, practices: [{ day: 'Mar', time: '5:00 p. m.' }, { day: 'Jue', time: '5:00 p. m.' }], available: 17, doubtful: 2, unavailable: 1, note: 'Trae las dos camisetas el sábado', read: 17, total: 20, cmj: [36, 37, 39, 40] },
    { id: 'u16', label: 'U16', fixture: { day: 'Sáb',     opponent: 'United', time: '10:00 a. m.', venue: 'Local' }, practices: [{ day: 'Mar', time: '5:00 p. m.' }, { day: 'Jue', time: '5:00 p. m.' }], available: 18, doubtful: 3, unavailable: 1, note: 'Revisión de uniformes el viernes', read: 20, total: 22, cmj: [39, 41, 40, 43] },
    { id: 'first', label: 'Primer equipo', fixture: { day: 'Dom',     opponent: 'City', time: '3:00 p. m.', venue: 'Visita' }, practices: [{ day: 'Lun', time: '6:30 p. m.' }, { day: 'Mié', time: '6:30 p. m.' }, { day: 'Vie', time: '6:30 p. m.' }], available: 21, doubtful: 2, unavailable: 1, note: 'Plan de viaje del domingo', read: 23, total: 24, cmj: [42, 43, 45, 46] },
  ],
  defaultSquad: 'u16',
  focus: 'Primero fútbol. Y también atletismo.',
  cols: [
    { title: 'Entrenadores', text: 'Define los partidos y las prácticas de la semana, y mira quién está disponible antes del día de partido.' },
    { title: 'Jugadores', text: 'Los jugadores se unen con la invitación de su entrenador en la app para atletas y hacen su check-in cada día.', soon: { name: 'Aria 12', tag: 'Próximamente', text: 'nuestra app de fútbol' } },
    { title: 'Familias', text: 'Aria for Families mantiene informados a los tutores. Incluido en Core y Performance.' },
  ],
  price: { text: 'Precio por atleta, no por equipo. Core desde {price}/mes.', quote: 'Precio por atleta, no por equipo. Escríbenos para una cotización.', link: 'Ver precios' },
  ask: 'Pregúntanos por la configuración de tu club',
  cta: { primary: 'Agenda una llamada', secondary: 'Empieza gratis' },
};

export const clubs = { en, es };
