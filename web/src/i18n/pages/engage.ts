// Copy for the Platform pages in the Engage, Manage and Scale columns (R57 lane B3b).
// Kept apart from the shared dictionaries so the lanes do not collide; the Spanish object is
// typed against the English one, so a missing key is a type error.
import type { Locale } from '../index';

const title = (pre: string, lane: string, post: string) => ({ pre, lane, post });

export const engageEn = {
  common: {
    startFree: 'Start free',
    bookCall: 'Book a call',
    bookSchoolCall: 'Book a call for your school',
    talkToUs: 'Talk to us',
    seePricing: 'See pricing',
    alsoTitle: 'Also in Aria',
    alsoLabel: 'More of the platform',
  },

  messaging: {
    meta: {
      title: 'Messaging and community | Stadiora Labs',
      description:
        'Chat with one athlete, post to the team feed, message a whole group or send announcements with read receipts, all in Aria.',
    },
    eyebrow: 'Messaging and community',
    title: title('Talk to one athlete or ', 'the whole team', '.'),
    sub: 'Chat, a team feed, group messages and announcements, all in one place.',
    photoAlt: 'Teenagers laughing around a phone on a gym bench.',
    gridLabel: 'Four ways to message',
    chat: {
      title: '1:1 chat',
      sub: 'Private, coach to athlete.',
      name: 'Coach Daniela',
      status: 'Online',
      m1: 'Easy run today, 30 min. How do the legs feel?',
      m2: 'Still a bit sore, but ready for Thursday.',
      m3: 'Perfect. Ice after and sleep early.',
      times: ['10:14 AM', '10:17 AM', '10:18 AM'],
      placeholder: 'Type a message…',
    },
    feed: {
      title: 'Team feed',
      sub: 'Share wins with the team.',
      screenTitle: 'Team feed',
      group: 'Sprint Group',
      author: 'Coach Daniela',
      time: '2h ago',
      post: 'Great handoffs today! The details are paying off.',
      photoAlt: 'A relay handoff on a track, drawn as a simple illustration.',
      likes: '24',
      comments: '4 comments',
    },
    broadcast: {
      title: 'Group broadcast',
      sub: 'One message, one group.',
      window: 'New message',
      to: 'To:',
      group: 'Sprint group (8)',
      message: 'Bus leaves 7:00 am Saturday.',
      send: 'Send',
    },
    announcements: {
      title: 'Announcements',
      sub: 'Important news, with read receipts.',
      label: 'Announcement',
      headline: 'Season kickoff meeting · Friday 5 pm',
      body: 'We’ll go over the season plan, travel and uniform details. See you there!',
      progress: '18 of 24 read',
      readers: [
        { name: 'Diego M.', when: 'Read · 2h ago' },
        { name: 'Sofia R.', when: 'Read · 3h ago' },
        { name: 'Jordan K.', when: 'Read · 4h ago' },
      ],
    },
    privacy: 'The team feed follows age and privacy settings.',
    families: {
      text: 'Coaches can send updates to parents in Aria for Families.',
      link: 'Learn about the guardian portal',
    },
    also: ['guardian', 'teams', 'readiness'],
  },

  guardian: {
    meta: {
      title: 'Guardian portal: Aria for Families | Stadiora Labs',
      description:
        'Aria for Families shows parents their child’s week, coach messages and forms to sign, in the browser with nothing to install.',
    },
    eyebrow: 'Guardian portal',
    title: title('', 'Keep families', ' in the loop.'),
    sub: 'Aria for Families shows parents their child’s week, coach messages and forms to sign. In the browser, nothing to install.',
    ctaPrimary: 'Book a call for your school',
    ctaSecondary: 'See how it works',
    photoAlt:
      'A mother and her teenage son look at her phone together at the kitchen table in lamp light, a backpack on the chair beside them.',
    seeTitle: 'What families see',
    seeLabel: 'A parent’s view of the week',
    appName: 'Aria for Families',
    switcherLabel: 'Choose a child',
    children: [
      {
        name: 'Sofia',
        week: 'This week: 4 sessions',
        weekDetail: '2 practices · 1 game · 1 meet',
        coach: 'Coach Daniela',
        day: 'Mon',
        message: 'Great effort today! Focus on recovery and we’ll build on this next week.',
        form: 'Travel consent · Signed',
        formDetail: 'Spring Invitational',
        signed: true,
      },
      {
        name: 'Mateo',
        week: 'This week: 2 sessions',
        weekDetail: '1 practice · 1 game',
        coach: 'Coach Moore',
        day: 'Tue',
        message: 'Good hustle today. Bring cleats on Thursday.',
        form: 'Travel consent · To sign',
        formDetail: 'Spring Invitational',
        signed: false,
      },
    ],
    phoneTabs: ['Home', 'Schedule', 'Messages', 'Forms'],
    cards: [
      { icon: 'calendar', title: 'This week', body: 'Sessions and games at a glance.' },
      { icon: 'chat', title: 'Messages', body: 'Notes from coaches, in one place.' },
      { icon: 'file', title: 'Forms', body: 'Read and sign online.' },
      { icon: 'plane', title: 'Trips', body: 'Dates, times and what to bring.' },
    ],
    consentLabel: 'How consent works',
    consent: ['Guardians give consent for minors', 'Athletes choose what each coach sees', 'Admins can’t override consent'],
    pricing: {
      title: 'Included in Core and Performance.',
      see: 'See pricing',
    },
    also: ['messaging', 'teams', 'readiness'],
  },

  teams: {
    meta: {
      title: 'Teams and institutions | Stadiora Labs',
      description:
        'Set up teams and staff, see every team in one view and export program reports for schools, clubs and departments.',
    },
    eyebrow: 'Teams and institutions',
    title: title('', 'Every team, one clear view.', ''),
    sub: 'Teams, staff and reports for schools, clubs and departments.',
    ctaPrimary: 'Book a call',
    ctaSecondary: 'See pricing',
    photoAlt: 'An athletic director with a tablet in a school gym.',
    panelLabel: 'A school workspace with five teams',
    school: 'Your School',
    coach: 'Coach Rivera',
    initials: 'CR',
    sidebar: ['Home', 'Teams', 'Staff', 'Calendar', 'Reports'],
    tabs: ['Overview', 'Teams', 'Staff', 'Calendar', 'Reports'],
    stats: [
      { value: '5', label: 'teams', icon: 'users' },
      { value: '166', label: 'athletes', icon: 'user' },
      { value: '12', label: 'coaches', icon: 'users' },
      { value: '18', label: 'sessions this week', icon: 'calendar' },
    ],
    table: {
      caption: 'Teams at your school',
      head: ['Team', 'Athletes', 'Head coach', 'Status'],
      rows: [
        { team: 'Track and field', athletes: '42', coach: 'Coach Rivera' },
        { team: 'Girls’ soccer', athletes: '24', coach: 'Coach Daniela' },
        { team: 'Boys’ soccer', athletes: '26', coach: 'Coach Moore' },
        { team: 'Volleyball', athletes: '14', coach: 'Coach Chen' },
        { team: 'Strength and conditioning', athletes: '60', coach: 'Coach Patel' },
      ],
      active: 'Active',
    },
    staff: {
      title: 'Staff roles',
      roles: [
        'Head coach',
        'Assistant coach',
        'Physiotherapist',
        'Nutritionist',
        'Sport scientist',
        'Performance psychologist',
        'Observer',
      ],
    },
    reports: {
      title: 'Reports',
      items: ['Program summary', 'Upcoming events'],
      export: 'Export',
    },
    consent: 'Admin access never overrides athlete or guardian consent.',
    jobsTitle: 'What you can do',
    jobs: [
      { icon: 'users', title: 'Set up teams and staff', body: 'Add teams, invite coaches and pick their roles.' },
      { icon: 'chart', title: 'See the whole program', body: 'Sessions, events and activity across every team.' },
      { icon: 'file', title: 'Share reports', body: 'Export a program summary for your board or parents’ meeting.' },
    ],
    schools: {
      title: 'Built for schools',
      body: 'Priced by number of athletes. Core from {price}/mo for {athletes} athletes.',
      quote: 'Pricing goes by number of athletes. Talk to us for a quote.',
      see: 'See pricing',
    },
    also: ['guardian', 'messaging', 'powerlab'],
  },

  branded: {
    meta: {
      title: 'Custom-branded apps | Stadiora Labs',
      description:
        'Put your name, logo and colours on an athlete app built on the same platform as Aria. Talk to us to get started.',
    },
    eyebrow: 'Custom-branded apps',
    title: title('Your brand on your ', 'athletes’ phones', '.'),
    sub: 'Your name, logo and colours on an app built on the same platform as ours.',
    ctaPrimary: 'Talk to us',
    ctaSecondary: 'See pricing',
    fanLabel: 'Three apps built on one platform',
    makeTitle: 'What you can make yours',
    makeItems: [
      { icon: 'pencil', label: 'App name' },
      { icon: 'image', label: 'Icon and logo' },
      { icon: 'drop', label: 'Colours' },
      { icon: 'ball', label: 'Sport and features' },
      { icon: 'store', label: 'Store listing' },
    ],
    gym: {
      name: 'Your Gym',
      mark: 'YG',
      tagline: 'Train. Progress. Together.',
      iconLabel: 'Your Gym app icon',
      colours: 'Brand colours',
      cta: 'Get started',
    },
    howTitle: 'How it works',
    steps: ['Talk to us', 'We set up your brand with you', 'We publish it to the stores together'],
    addon: 'Add-on: {monthly}/mo + {setup} setup',
    addonQuote: 'Available as an add-on. Talk to us for a quote.',
    seePricing: 'See pricing',
    sameTitle: 'Same platform, every app',
    sameBody: 'Programs, nutrition, readiness and chat come with every app. New features reach every brand.',
    also: ['integrations', 'teams', 'programs'],
  },

  integrations: {
    meta: {
      title: 'Integrations | Stadiora Labs',
      description:
        'Bring sleep, steps and workouts from Apple Health and Health Connect into Aria, and import FIT, GPX and TCX files from your watch app.',
    },
    eyebrow: 'Integrations',
    title: title('Bring in the data ', 'you already have', '.'),
    sub: 'Sleep, steps and workouts from the phone, plus files from your watch.',
    ctaPrimary: 'Start free',
    photoAlt: 'A sweaty runner sits on a park bench after an early run, checking his phone, with a plain unbranded watch on his wrist.',
    liveLabel: 'Live today',
    live: 'Live',
    sources: [
      { id: 'apple', name: 'Apple Health', platform: 'iPhone' },
      { id: 'health-connect', name: 'Health Connect', platform: 'Android' },
    ],
    rows: [
      { icon: 'moon', label: 'Sleep' },
      { icon: 'steps', label: 'Steps' },
      { icon: 'dumbbell', label: 'Workouts' },
    ],
    import: {
      title: 'Import files',
      formats: ['FIT', 'GPX', 'TCX'],
      body: 'Upload a run or ride from your watch app.',
    },
    coming: 'Coming: Garmin, Strava, Polar',
    dataTitle: 'Your data, your call',
    data: ['Athletes choose what each coach sees', 'Download or delete your data from the app'],
    also: ['messaging', 'branded', 'readiness'],
  },

  cta: {
    talk: 'Talk to us',
  },
};

export type EngageDict = typeof engageEn;

export const engageEs: EngageDict = {
  common: {
    startFree: 'Empieza gratis',
    bookCall: 'Agenda una llamada',
    bookSchoolCall: 'Agenda una llamada escolar',
    talkToUs: 'Habla con nosotros',
    seePricing: 'Ver precios',
    alsoTitle: 'También en Aria',
    alsoLabel: 'Más de la plataforma',
  },

  messaging: {
    meta: {
      title: 'Mensajes y comunidad | Stadiora Labs',
      description:
        'Chatea con un atleta, publica en el muro del equipo, escribe a un grupo completo o envía anuncios con confirmación de lectura, todo en Aria.',
    },
    eyebrow: 'Mensajes y comunidad',
    title: title('Habla con un atleta o ', 'con todo el equipo', '.'),
    sub: 'Chat, muro del equipo, mensajes a grupos y anuncios, todo en un solo lugar.',
    photoAlt: 'Adolescentes riendo alrededor de un teléfono en una banca del gimnasio.',
    gridLabel: 'Cuatro formas de escribir',
    chat: {
      title: 'Chat 1:1',
      sub: 'Privado, de coach a atleta.',
      name: 'Coach Daniela',
      status: 'En línea',
      m1: 'Trote suave hoy, 30 min. Cómo sientes las piernas?',
      m2: 'Todavía algo cargadas, pero lista para el jueves.',
      m3: 'Perfecto. Hielo después y a dormir temprano.',
      times: ['10:14 AM', '10:17 AM', '10:18 AM'],
      placeholder: 'Escribe un mensaje…',
    },
    feed: {
      title: 'Muro del equipo',
      sub: 'Comparte los logros con el equipo.',
      screenTitle: 'Muro del equipo',
      group: 'Grupo de velocidad',
      author: 'Coach Daniela',
      time: 'hace 2 h',
      post: 'Muy buenos relevos hoy! Los detalles están dando resultado.',
      photoAlt: 'Un relevo en una pista, dibujado como una ilustración sencilla.',
      likes: '24',
      comments: '4 comentarios',
    },
    broadcast: {
      title: 'Difusión a grupos',
      sub: 'Un mensaje, un grupo.',
      window: 'Mensaje nuevo',
      to: 'Para:',
      group: 'Grupo de velocidad (8)',
      message: 'El bus sale el sábado a las 7:00 am.',
      send: 'Enviar',
    },
    announcements: {
      title: 'Anuncios',
      sub: 'Noticias importantes, con confirmación de lectura.',
      label: 'Anuncio',
      headline: 'Reunión de inicio de temporada · viernes 5 pm',
      body: 'Revisaremos el plan de la temporada, los viajes y el uniforme. Los esperamos!',
      progress: '18 de 24 lo leyeron',
      readers: [
        { name: 'Diego M.', when: 'Leído · hace 2 h' },
        { name: 'Sofía R.', when: 'Leído · hace 3 h' },
        { name: 'Jordan K.', when: 'Leído · hace 4 h' },
      ],
    },
    privacy: 'El muro del equipo respeta la edad y los ajustes de privacidad.',
    families: {
      text: 'Los coaches pueden enviar novedades a los padres en Aria for Families.',
      link: 'Conoce el portal de tutores',
    },
    also: ['guardian', 'teams', 'readiness'],
  },

  guardian: {
    meta: {
      title: 'Portal de tutores: Aria for Families | Stadiora Labs',
      description:
        'Aria for Families muestra a los padres la semana de su hijo, los mensajes del coach y los formularios por firmar, en el navegador y sin instalar nada.',
    },
    eyebrow: 'Portal de tutores',
    title: title('', 'Mantén a las familias', ' al tanto.'),
    sub: 'Aria for Families muestra a los padres la semana de su hijo, los mensajes del coach y los formularios por firmar. En el navegador, sin instalar nada.',
    ctaPrimary: 'Agenda una llamada escolar',
    ctaSecondary: 'Mira cómo funciona',
    photoAlt:
      'Una madre y su hijo adolescente miran juntos su teléfono en la mesa de la cocina con luz de lámpara, con una mochila en la silla.',
    seeTitle: 'Lo que ven las familias',
    seeLabel: 'La semana vista por un padre o una madre',
    appName: 'Aria for Families',
    switcherLabel: 'Elige un hijo',
    children: [
      {
        name: 'Sofía',
        week: 'Esta semana: 4 sesiones',
        weekDetail: '2 prácticas · 1 juego · 1 competencia',
        coach: 'Coach Daniela',
        day: 'Lun',
        message: 'Muy buen esfuerzo hoy! Nos enfocamos en la recuperación y seguimos la próxima semana.',
        form: 'Permiso de viaje · Firmado',
        formDetail: 'Invitacional de primavera',
        signed: true,
      },
      {
        name: 'Mateo',
        week: 'Esta semana: 2 sesiones',
        weekDetail: '1 práctica · 1 juego',
        coach: 'Coach Moore',
        day: 'Mar',
        message: 'Buen ritmo hoy. Trae los tacos el jueves.',
        form: 'Permiso de viaje · Por firmar',
        formDetail: 'Invitacional de primavera',
        signed: false,
      },
    ],
    phoneTabs: ['Inicio', 'Horario', 'Mensajes', 'Formularios'],
    cards: [
      { icon: 'calendar', title: 'Esta semana', body: 'Sesiones y juegos de un vistazo.' },
      { icon: 'chat', title: 'Mensajes', body: 'Notas de los coaches, en un solo lugar.' },
      { icon: 'file', title: 'Formularios', body: 'Lee y firma en línea.' },
      { icon: 'plane', title: 'Viajes', body: 'Fechas, horarios y qué llevar.' },
    ],
    consentLabel: 'Cómo funciona el consentimiento',
    consent: [
      'Los tutores dan el consentimiento por los menores',
      'Los atletas eligen qué ve cada coach',
      'Los administradores no pueden anular el consentimiento',
    ],
    pricing: {
      title: 'Incluido en Core y Performance.',
      see: 'Ver precios',
    },
    also: ['messaging', 'teams', 'readiness'],
  },

  teams: {
    meta: {
      title: 'Equipos e instituciones | Stadiora Labs',
      description:
        'Configura equipos y cuerpo técnico, mira todos los equipos en una vista y exporta reportes del programa para colegios, clubes y departamentos.',
    },
    eyebrow: 'Equipos e instituciones',
    title: title('', 'Cada equipo, una vista clara.', ''),
    sub: 'Equipos, cuerpo técnico y reportes para colegios, clubes y departamentos.',
    ctaPrimary: 'Agenda una llamada',
    ctaSecondary: 'Ver precios',
    photoAlt: 'Un director deportivo con una tableta en un gimnasio escolar.',
    panelLabel: 'El espacio de un colegio con cinco equipos',
    school: 'Tu colegio',
    coach: 'Coach Rivera',
    initials: 'CR',
    sidebar: ['Inicio', 'Equipos', 'Cuerpo técnico', 'Calendario', 'Reportes'],
    tabs: ['Resumen', 'Equipos', 'Cuerpo técnico', 'Calendario', 'Reportes'],
    stats: [
      { value: '5', label: 'equipos', icon: 'users' },
      { value: '166', label: 'atletas', icon: 'user' },
      { value: '12', label: 'coaches', icon: 'users' },
      { value: '18', label: 'sesiones esta semana', icon: 'calendar' },
    ],
    table: {
      caption: 'Equipos de tu colegio',
      head: ['Equipo', 'Atletas', 'Coach principal', 'Estado'],
      rows: [
        { team: 'Atletismo', athletes: '42', coach: 'Coach Rivera' },
        { team: 'Fútbol femenino', athletes: '24', coach: 'Coach Daniela' },
        { team: 'Fútbol masculino', athletes: '26', coach: 'Coach Moore' },
        { team: 'Voleibol', athletes: '14', coach: 'Coach Chen' },
        { team: 'Fuerza y acondicionamiento', athletes: '60', coach: 'Coach Patel' },
      ],
      active: 'Activo',
    },
    staff: {
      title: 'Roles del cuerpo técnico',
      roles: [
        'Entrenador principal',
        'Entrenador asistente',
        'Fisioterapeuta',
        'Nutricionista',
        'Científico del deporte',
        'Psicólogo del rendimiento',
        'Observador',
      ],
    },
    reports: {
      title: 'Reportes',
      items: ['Resumen del programa', 'Próximos eventos'],
      export: 'Exportar',
    },
    consent: 'El acceso de administrador nunca anula el consentimiento del atleta ni del tutor.',
    jobsTitle: 'Lo que puedes hacer',
    jobs: [
      { icon: 'users', title: 'Configura equipos y cuerpo técnico', body: 'Agrega equipos, invita a coaches y elige sus roles.' },
      { icon: 'chart', title: 'Mira todo el programa', body: 'Sesiones, eventos y actividad de todos los equipos.' },
      { icon: 'file', title: 'Comparte reportes', body: 'Exporta un resumen del programa para tu junta o la reunión de padres.' },
    ],
    schools: {
      title: 'Hecho para colegios',
      body: 'Precio según el número de atletas. Core desde {price}/mes para {athletes} atletas.',
      quote: 'El precio va según el número de atletas. Escríbenos para una cotización.',
      see: 'Ver precios',
    },
    also: ['guardian', 'messaging', 'powerlab'],
  },

  branded: {
    meta: {
      title: 'Apps con tu marca | Stadiora Labs',
      description:
        'Pon tu nombre, tu logo y tus colores en una app para atletas que usa la misma plataforma que Aria. Habla con nosotros para empezar.',
    },
    eyebrow: 'Apps con tu marca',
    title: title('Tu marca en los teléfonos de ', 'tus atletas', '.'),
    sub: 'Tu nombre, tu logo y tus colores en una app que usa la misma plataforma que la nuestra.',
    ctaPrimary: 'Habla con nosotros',
    ctaSecondary: 'Ver precios',
    fanLabel: 'Tres apps sobre una sola plataforma',
    makeTitle: 'Lo que puedes hacer tuyo',
    makeItems: [
      { icon: 'pencil', label: 'Nombre de la app' },
      { icon: 'image', label: 'Ícono y logo' },
      { icon: 'drop', label: 'Colores' },
      { icon: 'ball', label: 'Deporte y funciones' },
      { icon: 'store', label: 'Ficha en las tiendas' },
    ],
    gym: {
      name: 'Tu Gym',
      mark: 'TG',
      tagline: 'Entrena. Progresa. Juntos.',
      iconLabel: 'Ícono de la app Tu Gym',
      colours: 'Colores de marca',
      cta: 'Empezar',
    },
    howTitle: 'Cómo funciona',
    steps: ['Habla con nosotros', 'Preparamos tu marca contigo', 'La publicamos juntos en las tiendas'],
    addon: 'Complemento: {monthly}/mes + {setup} de configuración',
    addonQuote: 'Disponible como complemento. Escríbenos para una cotización.',
    seePricing: 'Ver precios',
    sameTitle: 'Una plataforma, todas las apps',
    sameBody: 'Programas, nutrición, preparación y chat vienen con cada app. Las funciones nuevas llegan a todas las marcas.',
    also: ['integrations', 'teams', 'programs'],
  },

  integrations: {
    meta: {
      title: 'Integraciones | Stadiora Labs',
      description:
        'Trae el sueño, los pasos y los entrenamientos de Apple Health y Health Connect a Aria, e importa archivos FIT, GPX y TCX de la app de tu reloj.',
    },
    eyebrow: 'Integraciones',
    title: title('Trae los datos ', 'que ya tienes', '.'),
    sub: 'Sueño, pasos y entrenamientos desde el teléfono, más los archivos de tu reloj.',
    ctaPrimary: 'Empieza gratis',
    photoAlt: 'Un corredor sudoroso se sienta en una banca del parque tras correr temprano y revisa su teléfono, con un reloj sin marca en la muñeca.',
    liveLabel: 'Disponible hoy',
    live: 'Activo',
    sources: [
      { id: 'apple', name: 'Apple Health', platform: 'iPhone' },
      { id: 'health-connect', name: 'Health Connect', platform: 'Android' },
    ],
    rows: [
      { icon: 'moon', label: 'Sueño' },
      { icon: 'steps', label: 'Pasos' },
      { icon: 'dumbbell', label: 'Entrenamientos' },
    ],
    import: {
      title: 'Importar archivos',
      formats: ['FIT', 'GPX', 'TCX'],
      body: 'Sube una carrera o un paseo en bici desde la app de tu reloj.',
    },
    coming: 'Próximamente: Garmin, Strava, Polar',
    dataTitle: 'Tus datos, tu decisión',
    data: ['Los atletas eligen qué ve cada coach', 'Descarga o elimina tus datos desde la app'],
    also: ['messaging', 'branded', 'readiness'],
  },

  cta: {
    talk: 'Habla con nosotros',
  },
};

export function useEngage(locale: Locale | string | undefined): EngageDict {
  return locale === 'es' ? engageEs : engageEn;
}
