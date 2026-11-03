// Copy for /resources/case-studies/ and the dev-only story template (DESIGN.md section 5, DESIGN-2.md section 12).
// No real stories exist yet. The production page shows an honest "coming soon" state. The placeholder cards and
// the story template below are only ever rendered by `astro dev` (import.meta.env.DEV) and carry "XX" stats.
const en = {
  meta: {
    title: 'Case studies | Stadiora Labs',
    description:
      'Stories from coaches and schools using Aria. First stories coming soon. Using Aria with your team? Tell us your story.',
  },
  title: 'Stories from coaches and schools',
  sub: 'How coaches and schools use Aria. First stories coming soon.',
  filterLabel: 'I want to…',
  filterGroup: 'Filter stories by what you want to do',
  outcomes: [
    { id: 'all', label: 'All' },
    { id: 'coaching', label: 'Deliver 1:1 coaching' },
    { id: 'team', label: 'Coach a team' },
    { id: 'school', label: 'Run a school program' },
    { id: 'engaged', label: 'Keep athletes engaged' },
    { id: 'overload', label: 'Prevent overload' },
  ],
  empty: {
    all: 'First stories coming soon.',
    outcome: 'No stories for “{outcome}” yet.',
    hint: 'Using Aria this way? Tell us your story.',
  },
  share: { title: 'Using Aria with your team? Tell us your story.', cta: 'Share your story' },
  dev: {
    stamp: 'Placeholder',
    featured: { outcome: 'school', title: 'How a school track program put every athlete on one plan', meta: 'Track and field · High school', stat: 'XX%', label: 'athletes logging weekly', slot: 'h3-highschool-big' },
    cards: [
      { outcome: 'team', title: 'How a youth academy keeps players on track', meta: 'Soccer · Club', stat: 'XX', label: 'athletes more consistent', slot: 'p4-team-coaching' },
      { outcome: 'engaged', title: 'How a nutrition coach supports stronger seasons', meta: 'Nutrition · High school', stat: 'XX', label: 'athletes building better habits', slot: 'h6-nutrition-big' },
      { outcome: 'overload', title: 'How a strength coach reduces overload risk', meta: 'Strength and conditioning · High school', stat: 'XX', label: 'fewer missed training days', slot: 'h5-gyms-big' },
    ],
    story: {
      banner: 'Placeholder story · not for publication',
      logo: 'Partner logo',
      title: 'How a high school track program put every athlete on one plan',
      stats: [
        { value: 'XX%', label: 'athletes logging weekly' },
        { value: 'XX', label: 'teams on one calendar' },
        { value: 'XX weeks', label: 'to roll out' },
      ],
      summary: [
        { term: 'Organization', value: 'Placeholder High School' },
        { term: 'Sport', value: 'Track and field' },
        { term: 'Athletes', value: 'XX' },
        { term: 'Using Aria since', value: '20XX' },
      ],
      quote: '“Placeholder quote from the athletic director.”',
      who: 'Name, role (placeholder)',
      back: 'All stories',
    },
  },
};

export type CaseStudiesCopy = typeof en;

const es: CaseStudiesCopy = {
  meta: {
    title: 'Casos de éxito | Stadiora Labs',
    description:
      'Historias de entrenadores y colegios que usan Aria. Pronto, las primeras historias. Usas Aria con tu equipo? Cuéntanos tu historia.',
  },
  title: 'Historias de entrenadores y colegios',
  sub: 'Cómo usan Aria entrenadores y colegios. Pronto, las primeras historias.',
  filterLabel: 'Quiero…',
  filterGroup: 'Filtra las historias según lo que quieres hacer',
  outcomes: [
    { id: 'all', label: 'Todas' },
    { id: 'coaching', label: 'Entrenar 1 a 1' },
    { id: 'team', label: 'Entrenar un equipo' },
    { id: 'school', label: 'Dirigir un programa escolar' },
    { id: 'engaged', label: 'Mantener motivados a los atletas' },
    { id: 'overload', label: 'Prevenir la sobrecarga' },
  ],
  empty: {
    all: 'Pronto, las primeras historias.',
    outcome: 'Aún no hay historias sobre “{outcome}”.',
    hint: 'Usas Aria así? Cuéntanos tu historia.',
  },
  share: { title: 'Usas Aria con tu equipo? Cuéntanos tu historia.', cta: 'Comparte tu historia' },
  dev: {
    stamp: 'Marcador',
    featured: { outcome: 'school', title: 'Cómo un programa de atletismo escolar puso a cada atleta en un mismo plan', meta: 'Atletismo · Colegio', stat: 'XX%', label: 'atletas que registran cada semana', slot: 'h3-highschool-big' },
    cards: [
      { outcome: 'team', title: 'Cómo una academia juvenil mantiene a sus jugadores en camino', meta: 'Fútbol · Club', stat: 'XX', label: 'atletas más constantes', slot: 'p4-team-coaching' },
      { outcome: 'engaged', title: 'Cómo una nutricionista apoya temporadas más fuertes', meta: 'Nutrición · Colegio', stat: 'XX', label: 'atletas con mejores hábitos', slot: 'h6-nutrition-big' },
      { outcome: 'overload', title: 'Cómo un preparador de fuerza reduce el riesgo de sobrecarga', meta: 'Fuerza y acondicionamiento · Colegio', stat: 'XX', label: 'menos días de entrenamiento perdidos', slot: 'h5-gyms-big' },
    ],
    story: {
      banner: 'Historia de marcador · no publicar',
      logo: 'Logo del aliado',
      title: 'Cómo un programa de atletismo escolar puso a cada atleta en un mismo plan',
      stats: [
        { value: 'XX%', label: 'atletas que registran cada semana' },
        { value: 'XX', label: 'equipos en un mismo calendario' },
        { value: 'XX semanas', label: 'para ponerlo en marcha' },
      ],
      summary: [
        { term: 'Organización', value: 'Colegio de marcador' },
        { term: 'Deporte', value: 'Atletismo' },
        { term: 'Atletas', value: 'XX' },
        { term: 'Usa Aria desde', value: '20XX' },
      ],
      quote: '“Cita de marcador de la directora deportiva.”',
      who: 'Nombre, cargo (marcador)',
      back: 'Todas las historias',
    },
  },
};

export const caseStudies = { en, es };
