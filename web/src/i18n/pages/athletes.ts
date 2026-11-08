// Copy for /solutions/athletes/ (DESIGN-2.md section 11). EN and ES.
// App names and statuses match the nav (en.ts / es.ts): Aria 12 is not released.
const en = {
  meta: {
    title: 'Athlete apps | Stadiora Labs',
    description:
      'An app for the way you train. Free to download. Connect with your coach when you are ready. Run with Aria, Aria 12 and FitMG.',
  },
  eyebrow: 'For athletes',
  titleBefore: 'An app for the way you ',
  titleUnder: 'train.',
  sub: "Free to download. Connect with your coach when you're ready.",
  appsLabel: 'Athlete apps',
  badge: { ios: 'Download on the App Store', android: 'Get it on Google Play' },
  badgeFiles: { ios: '/badges/app-store-en.svg', android: '/badges/google-play-en.png' },
  beta: 'Join the iOS beta',
  apps: [
    { id: 'run', name: 'Run with Aria', status: 'iOS and Android', live: true, slot: 'a1-athletes-sprinter', today: 'Today', date: 'Mon, Apr 22', items: [{ title: 'Track workout', sub: 'Speed development', meta: '6 × 200 m' }, { title: 'Warm up', sub: 'Completed', done: true }] },
    { id: 'aria12', name: 'Aria 12', status: 'Coming soon', live: false, slot: 'a2-athletes-dribbling', today: 'Today', date: 'Mon, Apr 22', items: [{ title: 'Team training', sub: 'Technical session', meta: '90 min' }, { title: 'Skills', sub: 'Dribbling and passing' }] },
    { id: 'fitmg', name: 'FitMG', status: 'Android · iOS beta', live: true, slot: 'a4-athletes-cable', today: 'Today', date: 'Mon, Apr 22', items: [{ title: 'Full body', sub: 'Strength and mobility', meta: '40 min' }, { title: 'Mobility', sub: '10 min' }] },
  ],
  every: {
    title: 'In every app',
    items: ['Today’s session', 'Food diary', 'Readiness', 'Chat with your coach'],
  },
  coach: {
    title: 'Have a coach?',
    text: 'Ask your coach for an invite, or start on your own.',
  },
  ctaTitle: 'Your next session is one tap away.',
  cta: { download: 'Download the athlete app', coach: 'Start as a coach' },
};

export type AthletesCopy = typeof en;

const es: AthletesCopy = {
  meta: {
    title: 'Apps para atletas | Stadiora Labs',
    description:
      'Una app para tu forma de entrenar. Descarga gratis. Conéctate con tu entrenador cuando quieras. Run with Aria, Aria 12 y FitMG.',
  },
  eyebrow: 'Para atletas',
  titleBefore: 'Una app para tu forma de ',
  titleUnder: 'entrenar.',
  sub: 'Descarga gratis. Conéctate con tu entrenador cuando quieras.',
  appsLabel: 'Apps para atletas',
  badge: { ios: 'Descárgala en el App Store', android: 'Disponible en Google Play' },
  badgeFiles: { ios: '/badges/app-store-es.svg', android: '/badges/google-play-es.png' },
  beta: 'Únete a la beta de iOS',
  apps: [
    { id: 'run', name: 'Run with Aria', status: 'iOS y Android', live: true, slot: 'a1-athletes-sprinter', today: 'Hoy', date: 'Lun, 22 abr', items: [{ title: 'Entrenamiento de pista', sub: 'Desarrollo de velocidad', meta: '6 × 200 m' }, { title: 'Calentamiento', sub: 'Completado', done: true }] },
    { id: 'aria12', name: 'Aria 12', status: 'Próximamente', live: false, slot: 'a2-athletes-dribbling', today: 'Hoy', date: 'Lun, 22 abr', items: [{ title: 'Entrenamiento de equipo', sub: 'Sesión técnica', meta: '90 min' }, { title: 'Habilidades', sub: 'Regate y pase' }] },
    { id: 'fitmg', name: 'FitMG', status: 'Android · iOS beta', live: true, slot: 'a4-athletes-cable', today: 'Hoy', date: 'Lun, 22 abr', items: [{ title: 'Cuerpo completo', sub: 'Fuerza y movilidad', meta: '40 min' }, { title: 'Movilidad', sub: '10 min' }] },
  ],
  every: {
    title: 'En cada app',
    items: ['La sesión de hoy', 'Diario de comidas', 'Preparación', 'Chat con tu entrenador'],
  },
  coach: {
    title: 'Tienes entrenador?',
    text: 'Pídele a tu entrenador una invitación, o empieza por tu cuenta.',
  },
  ctaTitle: 'Tu próxima sesión está a un toque.',
  cta: { download: 'Descarga la app para atletas', coach: 'Empieza como entrenador' },
};

export const athletes = { en, es };
