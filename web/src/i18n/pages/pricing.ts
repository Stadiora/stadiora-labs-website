// Pricing page copy. Spanish is typed against English, so a missing key is a type error.
// Spanish in this org omits the opening ¿ and ¡ marks; keep that style.
// Prices and counts are never written here: they come from src/data/pricing.ts and are substituted
// into the {tokens} below.

export const en = {
  meta: {
    title: 'Pricing | Stadiora Labs',
    description:
      'Simple pricing that grows with your roster. Start free, then pick Core or Performance by athlete count. Education rates for schools and institutions.',
  },
  h1: 'Simple pricing that grows with your roster.',
  plansTitle: 'Plans',
  controls: {
    label: 'Pricing options',
    billingLegend: 'Billing',
    monthly: 'Monthly',
    annual: 'Annual',
    annualSaves: 'Annual saves 10%',
    athletes: 'Athletes:',
    currency: 'Prices in USD',
    noScript:
      'Showing prices for 100 athletes, billed monthly. To see other sizes or annual billing, turn on JavaScript or talk to us.',
  },
  price: {
    unit: '/mo',
    billedMonthly: 'Billed monthly',
    billedYearly: 'Billed yearly: {total}/yr',
    meta: '{athletes} athletes · {coaches} coaches',
    from: 'from',
    live: '{plan}, {amount} dollars per month',
    liveYearly: '{plan}, {amount} dollars per month, billed yearly',
  },
  plans: {
    free: {
      name: 'Free',
      price: '$0',
      line: '1 coach · up to 10 athletes',
      sub: 'For one coach getting started. No card needed.',
      cta: 'Start free',
      checks: ['Training programs', 'Athlete app', '1:1 chat'],
    },
    core: {
      name: 'Core',
      cta: 'Start with Core',
      checks: ['Programs and AI program builder', 'Nutrition and readiness', 'Team feed and broadcasts'],
    },
    performance: {
      name: 'Performance',
      badge: 'Most complete',
      cta: 'Start with Performance',
      checks: ['Everything in Core', 'AI video analysis', 'More AI program generation'],
    },
    schools: {
      name: 'Schools and institutions',
      line: 'Education pricing for high schools, departments and colleges',
      sub: 'All program coaches included.',
      rates: 'See education rates',
      cta: 'Book a school demo',
      checks: ['Admin overview', 'Guardian portal', 'Consent for minors'],
    },
    federations: {
      name: 'Federations and enterprise',
      price: "Let's talk",
      line: 'For federations, leagues and large organizations',
      cta: 'Talk to us',
      checks: ['Many teams and organizations', 'Custom onboarding', 'Custom-branded app'],
    },
  },
  addons: {
    title: 'Add-ons',
    more: 'More info',
    extraCoach: {
      name: 'Extra coach',
      modalTitle: 'Extra coach',
      body: 'Add a coach to Core or Performance beyond the coaches included at your athlete size.',
      priceLine: '{amount} per month for each extra coach.',
      note: 'Schools and institutions plans include every coach in the program, so this does not apply to them.',
    },
    brandedApp: {
      name: 'Custom-branded app',
      price: '$99/mo + $499 setup',
      modalTitle: 'Custom-branded app',
      body: "Your logo, colors and name on the athlete app, built on the same platform. We'll confirm timing and store setup with you.",
      priceLine: '$99 per month, plus a one-time $499 setup.',
      cta: 'Talk to us',
    },
    credits: {
      name: 'AI and video credits',
      price: 'Talk to us',
      modalTitle: 'AI and video credits',
      body: "Need more AI program generation or video analysis than your plan covers? Talk to us and we'll work out what fits.",
      cta: 'Talk to us',
    },
  },
  education: {
    modalTitle: 'Education rates',
    intro: 'For schools and institutions. Every coach in the program is included.',
    caption: 'Education rates per month',
    colType: 'Program',
    colAthletes: 'Athletes',
    colPrice: 'Per month',
    rows: { highSchool: 'High school', department: 'Department', college: 'College' },
    note: 'Education rates do not change with the annual toggle. Book a demo and we will fit them to your program.',
    cta: 'Book a school demo',
  },
  modal: { close: 'Close' },
  faq: {
    title: 'Questions',
    items: [
      {
        q: 'What counts as an athlete?',
        a: "An athlete you coach on Aria that month: someone linked to your team who logs at least one workout. Coaches, staff and members who log no workouts that month don't count.",
      },
      {
        q: 'Is there a free trial?',
        a: 'Free is a plan, not a countdown: one coach, up to 10 athletes and no card. Start there, then move up when your roster grows.',
      },
      {
        q: 'Can I change plans later?',
        a: "Yes. Tell us which plan or athlete size you want and we'll switch it for you.",
      },
      {
        q: 'How does annual billing work?',
        a: 'Annual is paid up front for the year and takes 10% off Core and Performance. The price shows the monthly equivalent, with the yearly total underneath. For schools and institutions, talk to us.',
      },
      {
        q: 'Do schools get special pricing?',
        a: "Yes. Schools and institutions have education rates, and every coach in the program is included. See the rates on the Schools and institutions card, or book a demo and we'll fit them to your program.",
      },
      {
        q: 'What happens to athlete data and privacy?',
        a: "Athletes choose what each coach sees, and admins can't override consent. From the app's privacy settings, athletes can ask for a copy of their data or ask for it to be deleted.",
      },
      {
        q: 'How do minors and guardians work?',
        a: "Guardians give consent for minors. Athletes choose what each coach sees. Admins can't override consent. Aria for Families, the guardian portal, is included in Schools plans. For clubs and academies, it's available: talk to us.",
      },
    ],
  },
};

export type PricingCopy = typeof en;

export const es: PricingCopy = {
  meta: {
    title: 'Precios | Stadiora Labs',
    description:
      'Precios simples que crecen con tu grupo. Empieza gratis y elige Core o Performance según el número de atletas. Tarifas educativas para escuelas e instituciones.',
  },
  h1: 'Precios simples que crecen con tu grupo.',
  plansTitle: 'Planes',
  controls: {
    label: 'Opciones de precios',
    billingLegend: 'Facturación',
    monthly: 'Mensual',
    annual: 'Anual',
    annualSaves: 'Anual ahorra 10 %',
    athletes: 'Atletas:',
    currency: 'Precios en dólares (USD)',
    noScript:
      'Se muestran los precios para 100 atletas, con facturación mensual. Para ver otros tamaños o la facturación anual, activa JavaScript o habla con nosotros.',
  },
  price: {
    unit: '/mes',
    billedMonthly: 'Facturación mensual',
    billedYearly: 'Facturación anual: {total}/año',
    meta: '{athletes} atletas · {coaches} entrenadores',
    from: 'desde',
    live: '{plan}, {amount} dólares al mes',
    liveYearly: '{plan}, {amount} dólares al mes, facturación anual',
  },
  plans: {
    free: {
      name: 'Gratis',
      price: '$0',
      line: '1 entrenador · hasta 10 atletas',
      sub: 'Para un entrenador que está empezando. Sin tarjeta.',
      cta: 'Empieza gratis',
      checks: ['Programas de entrenamiento', 'App para atletas', 'Chat 1:1'],
    },
    core: {
      name: 'Core',
      cta: 'Empieza con Core',
      checks: ['Programas y creador de programas con IA', 'Nutrición y preparación', 'Muro del equipo y difusiones'],
    },
    performance: {
      name: 'Performance',
      badge: 'El más completo',
      cta: 'Empieza con Performance',
      checks: ['Todo lo de Core', 'Análisis de video con IA', 'Más generación de programas con IA'],
    },
    schools: {
      name: 'Escuelas e instituciones',
      line: 'Tarifas educativas para secundarias, departamentos y universidades',
      sub: 'Todos los entrenadores del programa incluidos.',
      rates: 'Ver tarifas educativas',
      cta: 'Agenda una demo escolar',
      checks: ['Panel de administración', 'Portal de tutores', 'Consentimiento para menores'],
    },
    federations: {
      name: 'Federaciones y empresas',
      price: 'Hablemos',
      line: 'Para federaciones, ligas y organizaciones grandes',
      cta: 'Habla con nosotros',
      checks: ['Muchos equipos y organizaciones', 'Incorporación a la medida', 'App con tu marca'],
    },
  },
  addons: {
    title: 'Complementos',
    more: 'Más información',
    extraCoach: {
      name: 'Entrenador adicional',
      modalTitle: 'Entrenador adicional',
      body: 'Suma un entrenador a Core o Performance más allá de los incluidos según el tamaño de tu grupo de atletas.',
      priceLine: '{amount} al mes por cada entrenador adicional.',
      note: 'Los planes para escuelas e instituciones incluyen a todos los entrenadores del programa, así que no aplica.',
    },
    brandedApp: {
      name: 'App con tu marca',
      price: '$99/mes + $499 de configuración',
      modalTitle: 'App con tu marca',
      body: 'Tu logo, tus colores y tu nombre en la app para atletas, construida sobre la misma plataforma. Confirmamos contigo los tiempos y la publicación en las tiendas.',
      priceLine: '$99 al mes, más $499 de configuración única.',
      cta: 'Habla con nosotros',
    },
    credits: {
      name: 'Créditos de IA y video',
      price: 'Habla con nosotros',
      modalTitle: 'Créditos de IA y video',
      body: 'Necesitas más generación de programas con IA o análisis de video de lo que cubre tu plan? Habla con nosotros y vemos qué te conviene.',
      cta: 'Habla con nosotros',
    },
  },
  education: {
    modalTitle: 'Tarifas educativas',
    intro: 'Para escuelas e instituciones. Todos los entrenadores del programa están incluidos.',
    caption: 'Tarifas educativas por mes',
    colType: 'Programa',
    colAthletes: 'Atletas',
    colPrice: 'Por mes',
    rows: { highSchool: 'Secundaria', department: 'Departamento', college: 'Universidad' },
    note: 'Las tarifas educativas no cambian con la opción anual. Agenda una demo y las ajustamos a tu programa.',
    cta: 'Agenda una demo escolar',
  },
  modal: { close: 'Cerrar' },
  faq: {
    title: 'Preguntas',
    items: [
      {
        q: 'Qué cuenta como un atleta?',
        a: 'Un atleta al que entrenas en Aria durante el mes: alguien vinculado a tu equipo que registra al menos un entrenamiento. Los entrenadores, el personal y los miembros que no registran entrenamientos ese mes no cuentan.',
      },
      {
        q: 'Hay una prueba gratuita?',
        a: 'Gratis es un plan, no una cuenta regresiva: un entrenador, hasta 10 atletas y sin tarjeta. Empieza ahí y sube de plan cuando crezca tu grupo.',
      },
      {
        q: 'Puedo cambiar de plan después?',
        a: 'Sí. Dinos qué plan o tamaño de grupo quieres y lo cambiamos por ti.',
      },
      {
        q: 'Cómo funciona la facturación anual?',
        a: 'El plan anual se paga por adelantado por todo el año y descuenta 10 % en Core y Performance. El precio muestra el equivalente mensual, con el total anual debajo. Para escuelas e instituciones, habla con nosotros.',
      },
      {
        q: 'Las escuelas tienen precios especiales?',
        a: 'Sí. Las escuelas e instituciones tienen tarifas educativas e incluyen a todos los entrenadores del programa. Mira las tarifas en la tarjeta de Escuelas e instituciones o agenda una demo y las ajustamos a tu programa.',
      },
      {
        q: 'Qué pasa con los datos de los atletas y la privacidad?',
        a: 'Los atletas eligen qué ve cada entrenador y los administradores no pueden anular el consentimiento. Desde la configuración de privacidad de la app, los atletas pueden pedir una copia de sus datos o solicitar que se eliminen.',
      },
      {
        q: 'Cómo funcionan los menores y los tutores?',
        a: 'Los tutores dan el consentimiento por los menores. Los atletas eligen qué ve cada entrenador. Los administradores no pueden anular el consentimiento. Aria for Families, el portal de tutores, está incluido en los planes para escuelas. Para clubes y academias está disponible: habla con nosotros.',
      },
    ],
  },
};
