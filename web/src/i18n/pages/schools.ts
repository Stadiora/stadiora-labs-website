// Copy for /solutions/schools/ (DESIGN.md section 4, DECISIONS #5, #11, #14, #18). EN and ES.
const en = {
  meta: {
    title: 'High schools and institutions | Stadiora Labs',
    description:
      'Every team in your school in one place. Coaches plan, families stay informed, and you see the whole program. Guardians give consent for minors.',
  },
  eyebrow: 'High schools and institutions',
  title: 'Every team in your school, in one place.',
  sub: 'Coaches plan. Families stay informed. You see the whole program.',
  admin: {
    title: 'Admin overview',
    school: 'Your School',
    athletes: 'athletes',
    status: { active: 'Active', planning: 'Planning' },
    rows: [
      { sport: 'Track and field', glyph: 'run', count: 42, status: 'active' },
      { sport: "Girls' soccer", glyph: 'ball', count: 24, status: 'active' },
      { sport: "Boys' soccer", glyph: 'ball', count: 26, status: 'active' },
      { sport: 'Volleyball', glyph: 'volleyball', count: 14, status: 'planning' },
      { sport: 'Strength and conditioning', glyph: 'weights', count: 60, status: 'active' },
    ],
  },
  guardian: {
    title: 'Guardian portal',
    app: 'Aria for Families',
    child: 'Sofia',
    childMeta: "Girls' soccer · Grade 11",
    week: 'This week: 4 sessions',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Sat'],
    message: { from: 'A message from Coach Daniela', ago: '2h ago', body: 'Great work this week! Be ready for a competitive session on Thursday.' },
    consent: 'Travel consent',
    signed: 'Signed',
    included: 'Aria for Families is included in Schools plans.',
  },
  consent: {
    title: 'Consent and minors, handled',
    lines: ['Guardians give consent for minors', 'Athletes choose what each coach sees', "Admins can't override consent"],
  },
  pricing: {
    lead: 'Education pricing:',
    text: ' high schools from {price}/mo for {athletes} athletes',
    link: 'See pricing',
    cta: 'Book a call for your school',
  },
};

export type SchoolsCopy = typeof en;

const es: SchoolsCopy = {
  meta: {
    title: 'Colegios e instituciones | Stadiora Labs',
    description:
      'Todos los equipos de tu colegio en un solo lugar. Los entrenadores planifican, las familias están al tanto y tú ves todo el programa. Los tutores dan su consentimiento por los menores.',
  },
  eyebrow: 'Colegios e instituciones',
  title: 'Todos los equipos de tu colegio, en un solo lugar.',
  sub: 'Los entrenadores planifican. Las familias están al tanto. Tú ves todo el programa.',
  admin: {
    title: 'Vista del administrador',
    school: 'Tu colegio',
    athletes: 'atletas',
    status: { active: 'Activo', planning: 'En planificación' },
    rows: [
      { sport: 'Atletismo', glyph: 'run', count: 42, status: 'active' },
      { sport: 'Fútbol femenino', glyph: 'ball', count: 24, status: 'active' },
      { sport: 'Fútbol masculino', glyph: 'ball', count: 26, status: 'active' },
      { sport: 'Voleibol', glyph: 'volleyball', count: 14, status: 'planning' },
      { sport: 'Fuerza y acondicionamiento', glyph: 'weights', count: 60, status: 'active' },
    ],
  },
  guardian: {
    title: 'Portal para tutores',
    app: 'Aria for Families',
    child: 'Sofía',
    childMeta: 'Fútbol femenino · 11.º grado',
    week: 'Esta semana: 4 sesiones',
    days: ['Lun', 'Mar', 'Mié', 'Jue', 'Sáb'],
    message: { from: 'Un mensaje de la entrenadora Daniela', ago: 'hace 2 h', body: 'Gran trabajo esta semana! Prepárate para una sesión competitiva el jueves.' },
    consent: 'Permiso de viaje',
    signed: 'Firmado',
    included: 'Aria for Families está incluido en los planes para colegios.',
  },
  consent: {
    title: 'Consentimiento y menores, resuelto',
    lines: ['Los tutores dan su consentimiento por los menores', 'Los atletas eligen qué ve cada entrenador', 'Los administradores no pueden anular el consentimiento'],
  },
  pricing: {
    lead: 'Precios para educación:',
    text: ' colegios desde {price}/mes para {athletes} atletas',
    link: 'Ver precios',
    cta: 'Agenda una llamada para tu colegio',
  },
};

export const schools = { en, es };
