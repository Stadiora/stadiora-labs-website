// Copy for /platform/programs/ (DESIGN.md section 3). Fictional demo data only.
import type { Locale } from '../index';
import type { PageMeta } from './coach-common';

const en = {
  meta: {
    title: 'Programs and AI program builder | Stadiora Labs',
    description:
      'Plan training once, then adjust it for every athlete. Start from a template, ask Aria to draft a program, or import the plan you already use.',
  } satisfies PageMeta,
  hero: {
    eyebrow: 'Programs and AI program builder',
    title: 'Plan training once. Adjust it for every athlete.',
    secondary: 'See it in action',
    photoAlt: 'A coach planning on a laptop on the bleachers while athletes warm up on the track.',
  },
  rowsLabel: 'What you can do with programs',
  rows: [
    { key: 'template', title: 'Start from a template', body: 'Pick a block, change the dates and loads, done.' },
    { key: 'ai', title: 'Ask Aria to draft a program', body: 'Describe the block. Aria drafts it, you edit and approve.' },
    { key: 'send', title: 'Send it to a team or one athlete', body: "Assign to a group, then tweak one athlete's version." },
    {
      key: 'import',
      title: 'Import what you already use',
      body: 'Bring in a PDF, Word, Excel or CSV file. You review it before it is saved.',
    },
    { key: 'log', title: 'Athletes log it in the app', body: 'They see today’s session and log sets, times and how it felt.' },
  ],
  browserUrl: 'app.ariaforcoaches.com',
  screens: {
    sidebar: ['Home', 'Athletes', 'Programs', 'Messages', 'Team'],
    templates: {
      title: 'Program templates',
      search: 'Search templates',
      tabs: ['All', 'Track and field', 'Strength', 'General'],
      cards: [
        { name: 'Pre-season base', meta: '6 weeks', desc: 'Build aerobic capacity and general strength.' },
        { name: '400 m speed endurance', meta: '8 weeks', desc: 'Develop speed endurance and race fitness.' },
        { name: 'Strength for sprinters', meta: '4 weeks', desc: 'Build power and maximal strength.' },
        { name: 'Speed development', meta: '6 weeks', desc: 'Acceleration, top speed and mechanics.' },
        { name: 'Hurdle technique', meta: '6 weeks', desc: 'Technical drills and rhythm.' },
        { name: 'Season preparation', meta: '8 weeks', desc: 'Bring it all together for competition.' },
      ],
      selected: 1,
    },
    ai: {
      title: 'Ask Aria',
      prompt: '8-week 400 m block for my sprint group, 4 days a week. Meet on Dec 12.',
      draftTitle: '400 m speed endurance',
      draftMeta: '8 weeks · 4 sessions a week · Draft',
      edit: 'Edit',
      approve: 'Approve',
      hint: 'Review it, change anything, then approve.',
    },
    send: {
      title: 'Send program',
      program: '400 m speed endurance',
      tabs: ['Groups', 'One athlete'],
      groups: [
        { name: 'Sprint group (Demo)', meta: '8 athletes' },
        { name: 'Distance group (Demo)', meta: '6 athletes' },
      ],
      start: 'Start date',
      startValue: 'Mon, Apr 22',
      variantTitle: 'Need a change for one athlete?',
      variantBody: 'Make a copy just for Valeria (Demo) and edit it.',
      send: 'Send',
    },
    import: {
      title: 'Import a plan',
      drop: 'Drop a file here',
      formats: 'PDF, Word, Excel or CSV',
      file: 'Spring-block.xlsx',
      ready: 'Ready to review',
      rows: [
        { day: 'Mon', text: 'Acceleration · 6 × 30 m' },
        { day: 'Tue', text: 'Tempo · 6 × 200 m' },
        { day: 'Thu', text: 'Speed endurance · 3 × 300 m' },
      ],
      confirm: 'Looks right? Save it as a program.',
      save: 'Save program',
    },
    phone: {
      title: 'Today',
      date: 'Mon, Apr 22',
      section: 'Your workout',
      workout: '400 m speed endurance',
      week: 'Week 3 · Day 1',
      items: [
        { name: 'Dynamic warm-up', meta: '' },
        { name: '6 × 300 m', meta: 'Target 45–47 s · 2 min rest' },
        { name: 'Core circuit', meta: '3 sets' },
        { name: 'Cool down', meta: '' },
      ],
      log: 'Log session',
      tabs: ['Home', 'Calendar', 'Progress', 'More'],
    },
    logPhone: {
      effort: 'How did it feel?',
      scale: ['Easy', 'Okay', 'Hard'],
      note: 'Added to the athlete’s history.',
      done: 'Done',
    },
  },
  proof: {
    id: 'proof',
    title: 'One plan, two views.',
    sub: 'You plan on the web. Athletes see it on their phone.',
    plan: 'What you plan',
    see: 'What they see',
    calendar: 'Sprint group (Demo) · Week 1',
    listTitle: 'What you can do',
    list: [
      'Sessions with sets, reps, distances and loads',
      'Templates you can reuse and edit',
      'A draft from Aria that you edit before it goes out',
      'Send to a group or make a version for one athlete',
      'Share a program as a PDF or a link',
      'Athletes log sets and how the session felt',
    ],
  },
  also: ['nutrition', 'readiness', 'messaging'] as const,
};

export type ProgramsCopy = typeof en;

const es: ProgramsCopy = {
  meta: {
    title: 'Programas y creador de programas con IA | Stadiora Labs',
    description:
      'Planifica el entrenamiento una vez y ajústalo para cada atleta. Parte de una plantilla, pídele un borrador a Aria o importa el plan que ya usas.',
  },
  hero: {
    eyebrow: 'Programas y creador de programas con IA',
    title: 'Planifica el entrenamiento una vez. Ajústalo para cada atleta.',
    secondary: 'Míralo en acción',
    photoAlt: 'Una entrenadora planifica en su laptop en las gradas mientras los atletas calientan en la pista.',
  },
  rowsLabel: 'Lo que puedes hacer con los programas',
  rows: [
    { key: 'template', title: 'Parte de una plantilla', body: 'Elige un bloque, cambia las fechas y las cargas, listo.' },
    {
      key: 'ai',
      title: 'Pídele un programa a Aria',
      body: 'Describe el bloque. Aria hace el borrador; tú lo editas y lo apruebas.',
    },
    {
      key: 'send',
      title: 'Envíalo a un equipo o a un atleta',
      body: 'Asígnalo a un grupo y luego ajusta la versión de un solo atleta.',
    },
    {
      key: 'import',
      title: 'Importa lo que ya usas',
      body: 'Trae un archivo PDF, Word, Excel o CSV. Lo revisas antes de guardarlo.',
    },
    {
      key: 'log',
      title: 'Los atletas lo registran en la app',
      body: 'Ven la sesión de hoy y registran series, tiempos y cómo se sintieron.',
    },
  ],
  browserUrl: 'app.ariaforcoaches.com',
  screens: {
    sidebar: ['Inicio', 'Atletas', 'Programas', 'Mensajes', 'Equipo'],
    templates: {
      title: 'Plantillas de programa',
      search: 'Buscar plantillas',
      tabs: ['Todas', 'Pista y campo', 'Fuerza', 'General'],
      cards: [
        { name: 'Base de pretemporada', meta: '6 semanas', desc: 'Desarrolla la capacidad aeróbica y la fuerza general.' },
        { name: 'Resistencia a la velocidad 400 m', meta: '8 semanas', desc: 'Desarrolla resistencia a la velocidad y estado de carrera.' },
        { name: 'Fuerza para velocistas', meta: '4 semanas', desc: 'Desarrolla potencia y fuerza máxima.' },
        { name: 'Desarrollo de velocidad', meta: '6 semanas', desc: 'Aceleración, velocidad máxima y mecánica.' },
        { name: 'Técnica de vallas', meta: '6 semanas', desc: 'Ejercicios técnicos y ritmo.' },
        { name: 'Preparación de temporada', meta: '8 semanas', desc: 'Junta todo para la competencia.' },
      ],
      selected: 1,
    },
    ai: {
      title: 'Pregúntale a Aria',
      prompt: 'Bloque de 8 semanas de 400 m para mi grupo de velocistas, 4 días por semana. Competencia el 12 de dic.',
      draftTitle: 'Resistencia a la velocidad 400 m',
      draftMeta: '8 semanas · 4 sesiones por semana · Borrador',
      edit: 'Editar',
      approve: 'Aprobar',
      hint: 'Revísalo, cambia lo que quieras y luego apruébalo.',
    },
    send: {
      title: 'Enviar programa',
      program: 'Resistencia a la velocidad 400 m',
      tabs: ['Grupos', 'Un atleta'],
      groups: [
        { name: 'Grupo de velocidad (Demo)', meta: '8 atletas' },
        { name: 'Grupo de fondo (Demo)', meta: '6 atletas' },
      ],
      start: 'Fecha de inicio',
      startValue: 'Lun, 22 abr',
      variantTitle: 'Necesitas un cambio para un atleta?',
      variantBody: 'Haz una copia solo para Valeria (Demo) y edítala.',
      send: 'Enviar',
    },
    import: {
      title: 'Importar un plan',
      drop: 'Suelta un archivo aquí',
      formats: 'PDF, Word, Excel o CSV',
      file: 'Bloque-primavera.xlsx',
      ready: 'Listo para revisar',
      rows: [
        { day: 'Lun', text: 'Aceleración · 6 × 30 m' },
        { day: 'Mar', text: 'Tempo · 6 × 200 m' },
        { day: 'Jue', text: 'Resistencia a la velocidad · 3 × 300 m' },
      ],
      confirm: 'Se ve bien? Guárdalo como programa.',
      save: 'Guardar programa',
    },
    phone: {
      title: 'Hoy',
      date: 'Lun, 22 abr',
      section: 'Tu entrenamiento',
      workout: 'Resistencia a la velocidad 400 m',
      week: 'Semana 3 · Día 1',
      items: [
        { name: 'Calentamiento dinámico', meta: '' },
        { name: '6 × 300 m', meta: 'Meta 45–47 s · 2 min de pausa' },
        { name: 'Circuito de core', meta: '3 series' },
        { name: 'Vuelta a la calma', meta: '' },
      ],
      log: 'Registrar sesión',
      tabs: ['Inicio', 'Calendario', 'Progreso', 'Más'],
    },
    logPhone: {
      effort: 'Cómo se sintió',
      scale: ['Fácil', 'Normal', 'Duro'],
      note: 'Se suma al historial del atleta.',
      done: 'Listo',
    },
  },
  proof: {
    id: 'proof',
    title: 'Un plan, dos vistas.',
    sub: 'Tú planificas en la web. Los atletas lo ven en su teléfono.',
    plan: 'Lo que planificas',
    see: 'Lo que ven ellos',
    calendar: 'Grupo de velocidad (Demo) · Semana 1',
    listTitle: 'Lo que puedes hacer',
    list: [
      'Sesiones con series, repeticiones, distancias y cargas',
      'Plantillas que puedes reutilizar y editar',
      'Un borrador de Aria que editas antes de enviarlo',
      'Envío a un grupo o una versión para un solo atleta',
      'Comparte un programa como PDF o con un enlace',
      'Los atletas registran series y cómo se sintió la sesión',
    ],
  },
  also: ['nutrition', 'readiness', 'messaging'] as const,
};

export const programsCopy: Record<Locale, ProgramsCopy> = { en, es };
