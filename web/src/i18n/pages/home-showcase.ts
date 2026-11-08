// Copy for the dark showcase on the home page (EN and ES): the "for every coach" header and the plan,
// measure, engage, scale and apps blocks. ES is neutral Latin American, tú form, no opening ¿ ¡.
export interface PlanEx {
  n: string;
  q: string;
}
export interface PlanBlock {
  h: string;
  ex: PlanEx[];
}
export type Row = [name: string, value: string, tone?: 'ok' | 'warn'];

export interface ShowcaseCopy {
  head: {
    heading: string;
    fromLabel: string;
    toLabel: string;
    from: string[];
    to: string[];
    sr: string;
    lead: string;
    mosaicLabel: string;
  };
  plan: {
    label: string;
    title: string;
    lead: string;
    stepsLabel: string;
    steps: { b: string; s: string }[];
    stage: {
      title: string;
      seg: [string, string];
      avatars: string[];
      weeks: { h: string; badge?: string; blocks: PlanBlock[] }[];
      popTitle: string;
      popWeeks: string[];
      person: { initials: string; name: string; note: string; change: string; only: string };
      send: string;
    };
  };
  measure: {
    label: string;
    title: string;
    tabsLabel: string;
    tabs: { t: string; p: string }[];
    slides: {
      readiness: { alt: string; h: string; st: string; sleepH: string; sleepBig: string; sleepSub: string };
      load: { alt: string; h: string; days: string[]; st: string };
      goal: { alt: string; h: string; text: string };
      checkin: { alt: string; who: string; when: string; h: string; rows: [string, string][] };
      integ: { alt: string; apple: string; health: string; soon: string };
    };
  };
  engage: {
    label: string;
    title: string;
    lead: string;
    tabsLabel: string;
    tabs: string[];
    phone: {
      chat: { name: string; sub: string; who: string; m1: string; m2: string; m3: string; input: string };
      feed: { name: string; sub: string; author: string; post: string; marta: string; comment: string; input: string };
      bc: { name: string; sub: string; to: string; text: string; sending: string; delivered: string; deliveredCount: string; leo: string; leoMsg: string; sofia: string; sofiaMsg: string; input: string };
      ann: { name: string; sub: string; pinned: string; text: string; seen: string; earlier: string; earlierText: string; input: string };
    };
    bubbles: { chat: [string, string]; feed: [string, string]; bc: [string, string]; ann: [string, string] };
  };
  scale: {
    label: string;
    title: string;
    lead: string;
    org: { h: string; p: string; school: string; meta: string; rows: { name: string; n: string; st: string; warn?: boolean }[] };
    guardian: { h: string; p: string; child: string; week: string; coach: string; msg: string; consent: string; signed: string };
    reports: { h: string; p: string; cap: string };
    power: { h: string; p: string; cap: string; unit: string; best: string };
    consent: { h: string; p: string; rows: { name: string; st: string; tone: 'ok' | 'cyan' | 'grey' }[] };
    railLabel: string;
    rail: {
      templates: { h: string; rows: Row[] };
      calendar: { h: string };
      meals: { h: string; rows: Row[] };
      trend: { h: string };
      jumps: { h: string };
      roster: { h: string; rows: Row[] };
      checkin: { h: string; rows: Row[] };
      guardians: { h: string; rows: Row[] };
    };
  };
  apps: {
    label: string;
    title: string;
    lead: string;
    link: string;
    chips: [string, string, string];
    brands: { n: string; m: string; c: string; i: string; status?: string }[];
    yourApp: string;
    today: string;
    session: string;
    coach: string;
    readiness: string;
    ready: string;
  };
}

const en: ShowcaseCopy = {
  head: {
    heading: 'For every coach',
    fromLabel: 'From',
    toLabel: 'To',
    from: ['one athlete', 'a sprint group', 'a small gym'],
    to: ['a whole school', 'a university', 'a federation'],
    sr: 'From one athlete, a sprint group or a small gym, to a whole school, a university or a federation.',
    lead: 'One platform from your first athlete to every team in your school. Start small, grow without switching tools.',
    mosaicLabel: 'One team · many athletes',
  },
  plan: {
    label: 'Plan and coach',
    title: 'Plan with precision. Coach with confidence.',
    lead: "Build a block once, step it up week by week, and change one athlete's plan without touching the team's.",
    stepsLabel: 'How the planner works',
    steps: [
      { b: 'Build the block', s: 'Drag sessions into the weeks.' },
      { b: 'Step up the load', s: 'Each week builds on the last.' },
      { b: 'Adjust for one athlete', s: "Change one plan, keep the team's." },
      { b: 'Send it to the team', s: 'Everyone sees it in the app.' },
    ],
    stage: {
      title: 'Season planner · Sprint group',
      seg: ['Block', '4 weeks'],
      avatars: ['VA', 'DM', '+16'],
      weeks: [
        {
          h: 'WEEK 1',
          blocks: [
            { h: 'SPEED · MON', ex: [{ n: 'Block starts', q: '6×30 m' }, { n: 'Flying sprints', q: '4×20 m' }, { n: 'Back squat', q: '4×5' }] },
            { h: 'ENDURANCE · THU', ex: [{ n: 'Speed endurance', q: '3×300 m' }, { n: 'Core circuit', q: '3 rounds' }] },
            { h: 'RECOVERY · SAT', ex: [{ n: 'Easy run', q: '20 min' }, { n: 'Mobility', q: '20 min' }] },
          ],
        },
        {
          h: 'WEEK 2',
          badge: '+5%',
          blocks: [
            { h: 'SPEED · MON', ex: [{ n: 'Block starts', q: '6×35 m' }, { n: 'Flying sprints', q: '5×20 m' }, { n: 'Back squat', q: '4×5' }] },
            { h: 'ENDURANCE · THU', ex: [{ n: 'Speed endurance', q: '3×300 m' }, { n: 'Core circuit', q: '3 rounds' }] },
            { h: 'RECOVERY · SAT', ex: [{ n: 'Easy run', q: '25 min' }, { n: 'Mobility', q: '20 min' }] },
          ],
        },
        {
          h: 'WEEK 3',
          badge: '+10%',
          blocks: [
            { h: 'SPEED · MON', ex: [{ n: 'Block starts', q: '6×40 m' }, { n: 'Flying sprints', q: '5×25 m' }, { n: 'Back squat', q: '5×5' }] },
            { h: 'ENDURANCE · THU', ex: [{ n: 'Speed endurance', q: '3×320 m' }, { n: 'Core circuit', q: '3 rounds' }] },
            { h: 'RECOVERY · SAT', ex: [{ n: 'Easy run', q: '25 min' }, { n: 'Mobility', q: '20 min' }] },
          ],
        },
        {
          h: 'WEEK 4',
          badge: '−20%',
          blocks: [
            { h: 'DELOAD · MON', ex: [{ n: 'Block starts', q: '4×30 m' }, { n: 'Mobility', q: '20 min' }] },
            { h: 'ENDURANCE · THU', ex: [] },
            { h: 'RECOVERY · SAT', ex: [{ n: 'Easy run', q: '15 min' }, { n: 'Mobility', q: '20 min' }] },
          ],
        },
      ],
      popTitle: 'Load by week',
      popWeeks: ['W1', 'W2', 'W3', 'W4'],
      person: { initials: 'VA', name: 'Valeria A.', note: 'Sore hamstring · Week 3', change: 'Speed endurance → 2×300 m', only: "Only Valeria's plan changed" },
      send: '✓ Sent to Sprint group · 18 athletes',
    },
  },
  measure: {
    label: 'Measure and adapt',
    title: 'Track, analyze, adapt. Every session.',
    tabsLabel: 'What you can track',
    tabs: [
      { t: 'Readiness', p: 'Sleep, soreness and mood in one daily picture, before practice starts.' },
      { t: 'Training load', p: "See the week's load building up before it becomes too much." },
      { t: 'Goals', p: 'Set a target with an athlete and watch the ring fill.' },
      { t: 'Check-ins', p: 'A daily check-in takes seconds: sleep, mood and how the legs feel.' },
      { t: 'Integrations', p: 'Syncs with Apple Health and Health Connect.' },
    ],
    slides: {
      readiness: {
        alt: 'A sprinter driving out of the curve on a floodlit track.',
        h: 'Readiness · today',
        st: 'Ready to train',
        sleepH: 'Sleep',
        sleepBig: '7 H 40 M',
        sleepSub: 'Mood: good · Legs: a bit sore',
      },
      load: { alt: 'A sprinter exploding out of a crouched start.', h: 'Training load · this week', days: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], st: 'Effort × minutes' },
      goal: { alt: 'A hurdler clearing a hurdle on the track.', h: 'Goal', text: 'Run 400 m under 58 s' },
      checkin: {
        alt: 'An athlete in a locker room after practice, holding a phone.',
        who: 'Check-in from Valeria',
        when: 'Today, 6:42 am',
        h: 'Check-in',
        rows: [
          ['Slept', '7 h 40 m'],
          ['Mood', 'Good'],
          ['Legs', 'A bit sore'],
        ],
      },
      integ: {
        alt: "Close-up of an athlete's wrist with a plain fitness watch.",
        apple: 'Apple Health',
        health: 'Health Connect',
        soon: 'Coming: more watch and fitness-app sync',
      },
    },
  },
  engage: {
    label: 'Engage',
    title: 'Stay close to every athlete.',
    lead: 'Message one athlete, a group or the whole team.',
    tabsLabel: 'Ways to message',
    tabs: ['1:1 chat', 'Team feed', 'Group broadcast', 'Announcements'],
    phone: {
      chat: {
        name: 'Coach Daniela',
        sub: 'Sprint group',
        who: 'Coach Daniela',
        m1: 'Easy run today, 30 min. How do the legs feel?',
        m2: 'Still a bit sore, but ready for Thursday 💪',
        m3: 'Perfect. Ice after and sleep early.',
        input: 'Message…',
      },
      feed: {
        name: 'Team feed',
        sub: 'Sprint group · 18',
        author: 'Coach Daniela',
        post: 'Great relays tonight. Proud of this group.',
        marta: 'Marta',
        comment: 'That last leg though 🚀',
        input: 'Write a comment…',
      },
      bc: {
        name: 'Group broadcast',
        sub: 'To: Sprint group',
        to: 'Broadcast · Sprint group (18)',
        text: 'Sprint group: bus leaves 7:00 am Saturday.',
        sending: 'Sending…',
        delivered: 'Delivered',
        deliveredCount: 'delivered',
        leo: 'Leo',
        leoMsg: 'On it 👍',
        sofia: 'Sofía',
        sofiaMsg: 'See you at 6:50!',
        input: 'Write to the group…',
      },
      ann: {
        name: 'Announcements',
        sub: 'Club · all teams',
        pinned: 'Pinned · Club announcement',
        text: 'Track closed Monday for resurfacing. Training moves to the school field.',
        seen: 'Seen by',
        earlier: 'Earlier',
        earlierText: 'New team photos are up in the feed.',
        input: 'Only admins can post here',
      },
    },
    bubbles: {
      chat: ['New message', 'Valeria: ready for Thursday 💪'],
      feed: ['🔥 12 reactions', 'on "Great relays tonight"'],
      bc: ['✓ Delivered to 18', 'Sprint group broadcast'],
      ann: ['📌 Pinned for all teams', 'Seen by 64'],
    },
  },
  scale: {
    label: 'Manage and scale',
    title: 'One team or every team in your school.',
    lead: 'Every team, coach and family in one view. Guardians give consent for minors, and athletes choose what each coach sees.',
    org: {
      h: 'Every team in one view',
      p: 'Admins see the whole program at a glance.',
      school: 'Your School',
      meta: '5 TEAMS · 166 ATHLETES',
      rows: [
        { name: 'Track and field', n: '42 athletes', st: 'Active' },
        { name: "Girls' soccer", n: '24 athletes', st: 'Active' },
        { name: "Boys' soccer", n: '26 athletes', st: 'Active' },
        { name: 'Volleyball', n: '14 athletes', st: 'Planning', warn: true },
        { name: 'Strength and conditioning', n: '60 athletes', st: 'Active' },
      ],
    },
    guardian: {
      h: 'Guardian portal',
      p: 'Keep families in the loop.',
      child: 'Mateo · U16',
      week: 'This week: 4 sessions',
      coach: 'Coach Ana',
      msg: 'Great effort on Tuesday!',
      consent: 'Travel consent',
      signed: 'Signed ✓',
    },
    reports: { h: 'Reports', p: 'See the whole program.', cap: 'SESSIONS COMPLETED · 8 WEEKS' },
    power: { h: 'Power Lab', p: 'Jump tests with your phone.', cap: 'COUNTERMOVEMENT JUMP', unit: '.2 CM', best: '▲ Best this month' },
    consent: {
      h: 'Consent for minors',
      p: "Guardians give consent. Admins can't override it.",
      rows: [
        { name: 'Guardian consent', st: 'Given', tone: 'ok' },
        { name: 'Shares readiness with', st: 'Coach Ana', tone: 'cyan' },
        { name: 'Shares nutrition with', st: 'Nobody', tone: 'grey' },
      ],
    },
    railLabel: 'More screens from Aria',
    rail: {
      templates: {
        h: 'Template library',
        rows: [
          ['Sprint 8-week block', '8 wk'],
          ['Pre-season strength', '6 wk'],
          ['Return to run', '4 wk'],
        ],
      },
      calendar: { h: 'Team calendar' },
      meals: {
        h: 'Meal plan · Sprint group',
        rows: [
          ['Breakfast', '620 kcal'],
          ['Lunch', '780 kcal'],
          ['Dinner', '840 kcal'],
        ],
      },
      trend: { h: 'Readiness trend' },
      jumps: { h: 'Jump test history' },
      roster: {
        h: 'Roster · Girls’ soccer',
        rows: [
          ['Ana R.', 'Ready', 'ok'],
          ['Lucía M.', 'Check in', 'warn'],
          ['Sofía P.', 'Ready', 'ok'],
        ],
      },
      checkin: {
        h: 'Check-in form',
        rows: [
          ['Sleep', '7 h 40 m'],
          ['Mood', 'Good'],
          ['Legs', 'A bit sore'],
        ],
      },
      guardians: {
        h: 'Guardian messages',
        rows: [
          ['Mateo’s mom', 'Thanks, coach!'],
          ['Travel consent', 'Signed ✓', 'ok'],
        ],
      },
    },
  },
  apps: {
    label: 'Custom-branded apps',
    title: 'Your program. Your app.',
    lead: 'One platform behind every app. Your logo, colours and name on the athlete app. Ask us about a custom-branded app.',
    link: 'Talk to us about your app',
    chips: ['Your logo', 'Your colours', 'Your name'],
    brands: [
      { n: 'Run with Aria', m: 'R', c: '#00BEF3', i: 'A1-athletes-sprinter-800', status: 'iOS and Android' },
      { n: 'Aria 12', m: '12', c: '#34D399', i: 'hero3-soccer-academies-big-800', status: 'Coming soon' },
      { n: 'FitMG', m: 'FM', c: '#FF4D5E', i: 'bd-jumper-flare-800', status: 'Android · iOS beta' },
      { n: 'Your app here', m: '★', c: '#0B1730', i: 'night-huddle-800' },
    ],
    yourApp: 'Your app here',
    today: 'TODAY',
    session: 'Tempo · 6 × 200 m',
    coach: 'Coach Daniela · 4:30 pm',
    readiness: 'Readiness 82',
    ready: 'Ready to train',
  },
};

const es: ShowcaseCopy = {
  head: {
    heading: 'Para cada entrenador',
    fromLabel: 'De',
    toLabel: 'A',
    from: ['un atleta', 'un grupo de velocistas', 'un gimnasio pequeño'],
    to: ['todo un colegio', 'una universidad', 'una federación'],
    sr: 'De un atleta, un grupo de velocistas o un gimnasio pequeño, a todo un colegio, una universidad o una federación.',
    lead: 'Una plataforma desde tu primer atleta hasta todos los equipos de tu colegio. Empieza pequeño y crece sin cambiar de herramienta.',
    mosaicLabel: 'Un equipo · muchos atletas',
  },
  plan: {
    label: 'Planifica y entrena',
    title: 'Planifica con precisión. Entrena con confianza.',
    lead: 'Crea un bloque una vez, súbelo semana a semana y cambia el plan de un atleta sin tocar el del equipo.',
    stepsLabel: 'Cómo funciona el planificador',
    steps: [
      { b: 'Arma el bloque', s: 'Arrastra sesiones a las semanas.' },
      { b: 'Sube la carga', s: 'Cada semana se apoya en la anterior.' },
      { b: 'Ajusta para un atleta', s: 'Cambia un plan y conserva el del equipo.' },
      { b: 'Envíalo al equipo', s: 'Todos lo ven en la app.' },
    ],
    stage: {
      title: 'Planificador · Grupo de velocidad',
      seg: ['Bloque', '4 semanas'],
      avatars: ['VA', 'DM', '+16'],
      weeks: [
        {
          h: 'SEMANA 1',
          blocks: [
            { h: 'VELOCIDAD · LUN', ex: [{ n: 'Salidas de bloque', q: '6×30 m' }, { n: 'Sprints lanzados', q: '4×20 m' }, { n: 'Sentadilla trasera', q: '4×5' }] },
            { h: 'RESISTENCIA · JUE', ex: [{ n: 'Resistencia veloz', q: '3×300 m' }, { n: 'Circuito de core', q: '3 rondas' }] },
            { h: 'RECUPERACIÓN · SÁB', ex: [{ n: 'Trote suave', q: '20 min' }, { n: 'Movilidad', q: '20 min' }] },
          ],
        },
        {
          h: 'SEMANA 2',
          badge: '+5%',
          blocks: [
            { h: 'VELOCIDAD · LUN', ex: [{ n: 'Salidas de bloque', q: '6×35 m' }, { n: 'Sprints lanzados', q: '5×20 m' }, { n: 'Sentadilla trasera', q: '4×5' }] },
            { h: 'RESISTENCIA · JUE', ex: [{ n: 'Resistencia veloz', q: '3×300 m' }, { n: 'Circuito de core', q: '3 rondas' }] },
            { h: 'RECUPERACIÓN · SÁB', ex: [{ n: 'Trote suave', q: '25 min' }, { n: 'Movilidad', q: '20 min' }] },
          ],
        },
        {
          h: 'SEMANA 3',
          badge: '+10%',
          blocks: [
            { h: 'VELOCIDAD · LUN', ex: [{ n: 'Salidas de bloque', q: '6×40 m' }, { n: 'Sprints lanzados', q: '5×25 m' }, { n: 'Sentadilla trasera', q: '5×5' }] },
            { h: 'RESISTENCIA · JUE', ex: [{ n: 'Resistencia veloz', q: '3×320 m' }, { n: 'Circuito de core', q: '3 rondas' }] },
            { h: 'RECUPERACIÓN · SÁB', ex: [{ n: 'Trote suave', q: '25 min' }, { n: 'Movilidad', q: '20 min' }] },
          ],
        },
        {
          h: 'SEMANA 4',
          badge: '−20%',
          blocks: [
            { h: 'DESCARGA · LUN', ex: [{ n: 'Salidas de bloque', q: '4×30 m' }, { n: 'Movilidad', q: '20 min' }] },
            { h: 'RESISTENCIA · JUE', ex: [] },
            { h: 'RECUPERACIÓN · SÁB', ex: [{ n: 'Trote suave', q: '15 min' }, { n: 'Movilidad', q: '20 min' }] },
          ],
        },
      ],
      popTitle: 'Carga por semana',
      popWeeks: ['S1', 'S2', 'S3', 'S4'],
      person: { initials: 'VA', name: 'Valeria A.', note: 'Isquios cargados · Semana 3', change: 'Resistencia veloz → 2×300 m', only: 'Solo cambió el plan de Valeria' },
      send: '✓ Enviado al Grupo de velocidad · 18 atletas',
    },
  },
  measure: {
    label: 'Mide y adapta',
    title: 'Mide, analiza, adapta. En cada sesión.',
    tabsLabel: 'Qué puedes medir',
    tabs: [
      { t: 'Preparación', p: 'Sueño, molestias y ánimo en una sola imagen diaria, antes de empezar el entrenamiento.' },
      { t: 'Carga de entrenamiento', p: 'Mira cómo se acumula la carga de la semana antes de que sea demasiado.' },
      { t: 'Metas', p: 'Fija una meta con el atleta y mira cómo se llena el anillo.' },
      { t: 'Check-ins', p: 'Un check-in diario toma segundos: sueño, ánimo y cómo se sienten las piernas.' },
      { t: 'Integraciones', p: 'Se sincroniza con Apple Health y Health Connect.' },
    ],
    slides: {
      readiness: {
        alt: 'Una velocista saliendo de la curva en una pista iluminada.',
        h: 'Preparación · hoy',
        st: 'Listo para entrenar',
        sleepH: 'Sueño',
        sleepBig: '7 H 40 MIN',
        sleepSub: 'Ánimo: bien · Piernas: algo cargadas',
      },
      load: { alt: 'Un velocista explotando desde una salida en cuclillas.', h: 'Carga de entrenamiento · esta semana', days: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], st: 'Esfuerzo × minutos' },
      goal: { alt: 'Un vallista saltando una valla en la pista.', h: 'Meta', text: 'Correr 400 m en menos de 58 s' },
      checkin: {
        alt: 'Un atleta en el vestuario después del entrenamiento, con el teléfono en la mano.',
        who: 'Check-in de Valeria',
        when: 'Hoy, 6:42 am',
        h: 'Check-in',
        rows: [
          ['Sueño', '7 h 40 min'],
          ['Ánimo', 'Bien'],
          ['Piernas', 'Algo cargadas'],
        ],
      },
      integ: {
        alt: 'Primer plano de la muñeca de un atleta con un reloj deportivo sencillo.',
        apple: 'Apple Health',
        health: 'Health Connect',
        soon: 'Próximamente: más sincronización con relojes y apps de fitness',
      },
    },
  },
  engage: {
    label: 'Conecta',
    title: 'Mantente cerca de cada atleta.',
    lead: 'Escribe a un atleta, a un grupo o a todo el equipo.',
    tabsLabel: 'Formas de escribir',
    tabs: ['Chat 1:1', 'Muro del equipo', 'Difusión a grupos', 'Anuncios'],
    phone: {
      chat: {
        name: 'Coach Daniela',
        sub: 'Grupo de velocidad',
        who: 'Coach Daniela',
        m1: 'Trote suave hoy, 30 min. Cómo van esas piernas?',
        m2: 'Aún algo cargadas, pero lista para el jueves 💪',
        m3: 'Perfecto. Hielo al terminar y a dormir temprano.',
        input: 'Mensaje…',
      },
      feed: {
        name: 'Muro del equipo',
        sub: 'Grupo de velocidad · 18',
        author: 'Coach Daniela',
        post: 'Grandes relevos esta noche. Orgullosa de este grupo.',
        marta: 'Marta',
        comment: 'Qué último tramo 🚀',
        input: 'Escribe un comentario…',
      },
      bc: {
        name: 'Difusión a grupos',
        sub: 'Para: Grupo de velocidad',
        to: 'Difusión · Grupo de velocidad (18)',
        text: 'Grupo de velocidad: el bus sale el sábado a las 7:00 am.',
        sending: 'Enviando…',
        delivered: 'Entregado',
        deliveredCount: 'entregados',
        leo: 'Leo',
        leoMsg: 'Listo 👍',
        sofia: 'Sofía',
        sofiaMsg: 'Nos vemos a las 6:50!',
        input: 'Escribe al grupo…',
      },
      ann: {
        name: 'Anuncios',
        sub: 'Club · todos los equipos',
        pinned: 'Fijado · Anuncio del club',
        text: 'Pista cerrada el lunes por repavimentación. El entrenamiento pasa a la cancha del colegio.',
        seen: 'Visto por',
        earlier: 'Antes',
        earlierText: 'Ya hay fotos nuevas del equipo en el muro.',
        input: 'Solo los administradores pueden publicar aquí',
      },
    },
    bubbles: {
      chat: ['Mensaje nuevo', 'Valeria: lista para el jueves 💪'],
      feed: ['🔥 12 reacciones', 'en "Grandes relevos esta noche"'],
      bc: ['✓ Entregado a 18', 'Difusión al Grupo de velocidad'],
      ann: ['📌 Fijado para todos los equipos', 'Visto por 64'],
    },
  },
  scale: {
    label: 'Gestiona y crece',
    title: 'Un equipo o todos los equipos de tu colegio.',
    lead: 'Todos los equipos, entrenadores y familias en una sola vista. Los tutores dan el consentimiento de los menores, y los atletas eligen qué ve cada entrenador.',
    org: {
      h: 'Todos los equipos en una vista',
      p: 'Los administradores ven todo el programa de un vistazo.',
      school: 'Tu colegio',
      meta: '5 EQUIPOS · 166 ATLETAS',
      rows: [
        { name: 'Atletismo', n: '42 atletas', st: 'Activo' },
        { name: 'Fútbol femenino', n: '24 atletas', st: 'Activo' },
        { name: 'Fútbol masculino', n: '26 atletas', st: 'Activo' },
        { name: 'Voleibol', n: '14 atletas', st: 'Planificando', warn: true },
        { name: 'Fuerza y acondicionamiento', n: '60 atletas', st: 'Activo' },
      ],
    },
    guardian: {
      h: 'Portal de tutores',
      p: 'Mantén a las familias al tanto.',
      child: 'Mateo · Sub-16',
      week: 'Esta semana: 4 sesiones',
      coach: 'Coach Ana',
      msg: 'Gran esfuerzo el martes!',
      consent: 'Permiso de viaje',
      signed: 'Firmado ✓',
    },
    reports: { h: 'Reportes', p: 'Mira todo el programa.', cap: 'SESIONES COMPLETADAS · 8 SEMANAS' },
    power: { h: 'Power Lab', p: 'Pruebas de salto con tu teléfono.', cap: 'SALTO CON CONTRAMOVIMIENTO', unit: '.2 CM', best: '▲ Mejor marca del mes' },
    consent: {
      h: 'Consentimiento de menores',
      p: 'Los tutores dan el consentimiento. Los administradores no pueden anularlo.',
      rows: [
        { name: 'Consentimiento del tutor', st: 'Dado', tone: 'ok' },
        { name: 'Comparte preparación con', st: 'Coach Ana', tone: 'cyan' },
        { name: 'Comparte nutrición con', st: 'Nadie', tone: 'grey' },
      ],
    },
    railLabel: 'Más pantallas de Aria',
    rail: {
      templates: {
        h: 'Biblioteca de plantillas',
        rows: [
          ['Bloque de velocidad de 8 sem', '8 sem'],
          ['Fuerza de pretemporada', '6 sem'],
          ['Regreso a correr', '4 sem'],
        ],
      },
      calendar: { h: 'Calendario del equipo' },
      meals: {
        h: 'Plan de comidas · Grupo de velocidad',
        rows: [
          ['Desayuno', '620 kcal'],
          ['Almuerzo', '780 kcal'],
          ['Cena', '840 kcal'],
        ],
      },
      trend: { h: 'Tendencia de preparación' },
      jumps: { h: 'Historial de saltos' },
      roster: {
        h: 'Plantilla · Fútbol femenino',
        rows: [
          ['Ana R.', 'Lista', 'ok'],
          ['Lucía M.', 'Falta check-in', 'warn'],
          ['Sofía P.', 'Lista', 'ok'],
        ],
      },
      checkin: {
        h: 'Formulario de check-in',
        rows: [
          ['Sueño', '7 h 40 min'],
          ['Ánimo', 'Bien'],
          ['Piernas', 'Algo cargadas'],
        ],
      },
      guardians: {
        h: 'Mensajes de tutores',
        rows: [
          ['Mamá de Mateo', 'Gracias, profe!'],
          ['Permiso de viaje', 'Firmado ✓', 'ok'],
        ],
      },
    },
  },
  apps: {
    label: 'Apps con tu marca',
    title: 'Tu programa. Tu app.',
    lead: 'Una plataforma detrás de cada app. Tu logo, tus colores y tu nombre en la app del atleta. Pregúntanos por una app con tu marca.',
    link: 'Habla con nosotros sobre tu app',
    chips: ['Tu logo', 'Tus colores', 'Tu nombre'],
    brands: [
      { n: 'Run with Aria', m: 'R', c: '#00BEF3', i: 'A1-athletes-sprinter-800', status: 'iOS y Android' },
      { n: 'Aria 12', m: '12', c: '#34D399', i: 'hero3-soccer-academies-big-800', status: 'Próximamente' },
      { n: 'FitMG', m: 'FM', c: '#FF4D5E', i: 'bd-jumper-flare-800', status: 'Android · iOS beta' },
      { n: 'Tu app aquí', m: '★', c: '#0B1730', i: 'night-huddle-800' },
    ],
    yourApp: 'Tu app aquí',
    today: 'HOY',
    session: 'Tempo · 6 × 200 m',
    coach: 'Coach Daniela · 4:30 pm',
    readiness: 'Preparación 82',
    ready: 'Listo para entrenar',
  },
};

export const homeShowcase: { en: ShowcaseCopy; es: ShowcaseCopy } = { en, es };
export { en, es };
