// Pricing page copy. Spanish is typed against English, so a missing key is a type error.
// Spanish in this org omits the opening ¿ and ¡ marks; keep that style.
// No number is ever written here, not a price, a count or a percentage: they come from src/data/prices.ts
// and are substituted into the {tokens} below. `npm run verify` fails on a digit in this file (except "1:1").

export const en = {
  meta: {
    title: 'Pricing | Stadiora Labs',
    description:
      'Simple pricing that grows with your roster. Start free, then pick Core or Performance by athlete count.',
  },
  eyebrow: 'Pricing',
  /** Three display lines; the last one carries the gradient. */
  h1: ['Simple pricing', 'that grows with', 'your roster.'],
  lead: 'Start free. Pay for the athletes you coach, not every member of your club.',
  plansTitle: 'Plans',
  controls: {
    label: 'Pricing options',
    billingLegend: 'Billing',
    monthly: 'Monthly',
    annual: 'Annual',
    annualSaves: 'Annual saves {percent}%',
    athletes: 'Athletes',
    coaches: '· {coaches} coaches',
    valueText: '{athletes} athletes, {coaches} coaches',
    currency: 'Prices in USD',
    noScript:
      'Showing prices for {athletes} athletes, billed monthly. To see other sizes or annual billing, turn on JavaScript or talk to us.',
  },
  price: {
    unit: '/mo',
    billedMonthly: 'Billed monthly',
    billedYearly: 'Billed yearly: {total}/yr',
    meta: '{athletes} athletes · {coaches} coaches',
    live: '{plan}, {amount} dollars per month',
    liveYearly: '{plan}, {amount} dollars per month, billed yearly',
  },
  reveal: { more: 'More info' },
  plans: {
    use: 'Use in my estimate',
    free: {
      name: 'Free',
      line: '{coaches} coach · up to {athletes} athletes',
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
    /** Two display lines. */
    heading: ['Add what you need.', 'Watch the total move.'],
    extraCoach: {
      name: 'Extra coach',
      switch: 'Add extra coaches',
      stepper: 'Number of extra coaches',
      fewer: 'One fewer coach',
      more: 'One more coach',
      body: 'Add a coach to Core or Performance beyond the coaches included at your athlete size.',
      priceLine: '{amount} per month for each extra coach.',
      unavailable: {
        free: 'Free includes one coach. Choose Core or Performance to add coaches.',
        federations: 'Federation and enterprise plans are sized with you.',
      },
    },
    brandedApp: {
      name: 'Custom-branded app',
      price: '{monthly}/mo + {setup} setup',
      switch: 'Add a custom-branded app',
      body: "Your logo, colors and name on the athlete app, built on the same platform. We'll confirm timing and store setup with you.",
      priceLine: '{monthly} per month, plus a one-time {setup} setup.',
      cta: 'Talk to us',
    },
    credits: {
      name: 'AI and video credits',
      price: 'Talk to us',
      switch: 'Ask about AI and video credits',
      body: "Need more AI program generation or video analysis than your plan covers? Talk to us and we'll work out what fits.",
      cta: 'Talk to us',
    },
  },
  estimate: {
    title: 'Your estimate',
    perMonth: 'per month',
    custom: 'custom pricing',
    plusCredits: '+ credits',
    yearly: 'yearly',
    setup: 'One-time setup',
    planRow: '{plan} · {athletes} athletes',
    coachRow: 'Extra coach × {qty}',
    fine: 'An estimate, not a quote. There is no card form here: we confirm your plan with you.',
    live: 'Estimate: {plan}, {amount} dollars per month',
    liveCustom: 'Estimate: {plan}, custom pricing',
    liveSetup: 'plus a one-time {setup} setup',
    liveCredits: 'plus AI and video credits, talk to us',
  },
  faq: {
    eyebrow: 'FAQ',
    /** Two display lines. */
    heading: ['Questions,', 'answered.'],
    items: [
      {
        q: 'What counts as an athlete?',
        a: "An athlete you coach on Aria that month: someone linked to your team who logs at least one workout. Coaches, staff and members who log no workouts that month don't count.",
      },
      {
        q: 'Is there a free trial?',
        a: 'Free is a plan, not a countdown: one coach, up to {athletes} athletes and no card. Start there, then move up when your roster grows.',
      },
      {
        q: 'Can I change plans later?',
        a: "Yes. Tell us which plan or athlete size you want and we'll switch it for you.",
      },
      {
        q: 'How does annual billing work?',
        a: 'Annual is paid up front for the year and takes {percent}% off Core and Performance. The price shows the monthly equivalent, with the yearly total underneath.',
      },
      {
        q: 'How do schools pay?',
        a: 'The same way as every team: by number of athletes. Pick Core or Performance at your size. For very large or multi-school organizations, talk to us.',
      },
      {
        q: 'What happens to athlete data and privacy?',
        a: "Athletes choose what each coach sees, and admins can't override consent. From the app's privacy settings, athletes can request deletion of their account and data. Our team handles each request, so it isn't instant.",
      },
      {
        q: 'How do minors and guardians work?',
        a: "Guardians give consent for minors. Athletes choose what each coach sees. Admins can't override consent. Aria for Families, the guardian portal, is included in Core and Performance.",
      },
    ],
  },
  final: {
    /** Two display lines; the second carries the gradient. */
    title: ['Ready when', 'your season is.'],
    lead: 'Start free with one coach and up to {athletes} athletes. No card needed.',
    coach: 'Start as a coach',
    call: 'Book a call',
  },
};

export type PricingCopy = typeof en;

export const es: PricingCopy = {
  meta: {
    title: 'Precios | Stadiora Labs',
    description:
      'Precios simples que crecen con tu grupo. Empieza gratis y elige Core o Performance según el número de atletas.',
  },
  eyebrow: 'Precios',
  h1: ['Precios simples', 'que crecen con', 'tu grupo.'],
  lead: 'Empieza gratis. Paga por los atletas que entrenas, no por cada miembro de tu club.',
  plansTitle: 'Planes',
  controls: {
    label: 'Opciones de precios',
    billingLegend: 'Facturación',
    monthly: 'Mensual',
    annual: 'Anual',
    annualSaves: 'Anual ahorra {percent} %',
    athletes: 'Atletas',
    coaches: '· {coaches} entrenadores',
    valueText: '{athletes} atletas, {coaches} entrenadores',
    currency: 'Precios en dólares (USD)',
    noScript:
      'Se muestran los precios para {athletes} atletas, con facturación mensual. Para ver otros tamaños o la facturación anual, activa JavaScript o habla con nosotros.',
  },
  price: {
    unit: '/mes',
    billedMonthly: 'Facturación mensual',
    billedYearly: 'Facturación anual: {total}/año',
    meta: '{athletes} atletas · {coaches} entrenadores',
    live: '{plan}, {amount} dólares al mes',
    liveYearly: '{plan}, {amount} dólares al mes, facturación anual',
  },
  reveal: { more: 'Más información' },
  plans: {
    use: 'Usar en mi estimación',
    free: {
      name: 'Gratis',
      line: '{coaches} entrenador · hasta {athletes} atletas',
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
    heading: ['Suma lo que necesitas.', 'Mira cómo se mueve el total.'],
    extraCoach: {
      name: 'Entrenador adicional',
      switch: 'Agregar entrenadores adicionales',
      stepper: 'Número de entrenadores adicionales',
      fewer: 'Un entrenador menos',
      more: 'Un entrenador más',
      body: 'Suma un entrenador a Core o Performance más allá de los incluidos según el tamaño de tu grupo de atletas.',
      priceLine: '{amount} al mes por cada entrenador adicional.',
      unavailable: {
        free: 'Gratis incluye un entrenador. Elige Core o Performance para sumar entrenadores.',
        federations: 'Los planes para federaciones y empresas se dimensionan contigo.',
      },
    },
    brandedApp: {
      name: 'App con tu marca',
      price: '{monthly}/mes + {setup} de configuración',
      switch: 'Agregar una app con tu marca',
      body: 'Tu logo, tus colores y tu nombre en la app para atletas, construida sobre la misma plataforma. Confirmamos contigo los tiempos y la publicación en las tiendas.',
      priceLine: '{monthly} al mes, más {setup} de configuración única.',
      cta: 'Habla con nosotros',
    },
    credits: {
      name: 'Créditos de IA y video',
      price: 'Habla con nosotros',
      switch: 'Consultar por créditos de IA y video',
      body: 'Necesitas más generación de programas con IA o análisis de video de lo que cubre tu plan? Habla con nosotros y vemos qué te conviene.',
      cta: 'Habla con nosotros',
    },
  },
  estimate: {
    title: 'Tu estimación',
    perMonth: 'al mes',
    custom: 'precio a la medida',
    plusCredits: '+ créditos',
    yearly: 'anual',
    setup: 'Configuración única',
    planRow: '{plan} · {athletes} atletas',
    coachRow: 'Entrenador adicional × {qty}',
    fine: 'Es una estimación, no una cotización. Aquí no hay formulario de tarjeta: confirmamos tu plan contigo.',
    live: 'Estimación: {plan}, {amount} dólares al mes',
    liveCustom: 'Estimación: {plan}, precio a la medida',
    liveSetup: 'más {setup} de configuración única',
    liveCredits: 'más créditos de IA y video, habla con nosotros',
  },
  faq: {
    eyebrow: 'Preguntas frecuentes',
    heading: ['Preguntas,', 'respondidas.'],
    items: [
      {
        q: 'Qué cuenta como un atleta?',
        a: 'Un atleta al que entrenas en Aria durante el mes: alguien vinculado a tu equipo que registra al menos un entrenamiento. Los entrenadores, el personal y los miembros que no registran entrenamientos ese mes no cuentan.',
      },
      {
        q: 'Hay una prueba gratuita?',
        a: 'Gratis es un plan, no una cuenta regresiva: un entrenador, hasta {athletes} atletas y sin tarjeta. Empieza ahí y sube de plan cuando crezca tu grupo.',
      },
      {
        q: 'Puedo cambiar de plan después?',
        a: 'Sí. Dinos qué plan o tamaño de grupo quieres y lo cambiamos por ti.',
      },
      {
        q: 'Cómo funciona la facturación anual?',
        a: 'El plan anual se paga por adelantado por todo el año y descuenta {percent} % en Core y Performance. El precio muestra el equivalente mensual, con el total anual debajo.',
      },
      {
        q: 'Cómo pagan las escuelas?',
        a: 'Igual que cualquier equipo: según el número de atletas. Elige Core o Performance según tu tamaño. Para organizaciones muy grandes o con varias escuelas, habla con nosotros.',
      },
      {
        q: 'Qué pasa con los datos de los atletas y la privacidad?',
        a: 'Los atletas eligen qué ve cada entrenador y los administradores no pueden anular el consentimiento. Desde la configuración de privacidad de la app, los atletas pueden solicitar que se elimine su cuenta y sus datos. Cada solicitud la atiende nuestro equipo, así que no es instantánea.',
      },
      {
        q: 'Cómo funcionan los menores y los tutores?',
        a: 'Los tutores dan el consentimiento por los menores. Los atletas eligen qué ve cada entrenador. Los administradores no pueden anular el consentimiento. Aria for Families, el portal de tutores, está incluido en Core y Performance.',
      },
    ],
  },
  final: {
    title: ['Listos cuando', 'empiece tu temporada.'],
    lead: 'Empieza gratis con un entrenador y hasta {athletes} atletas. Sin tarjeta.',
    coach: 'Empieza como entrenador',
    call: 'Agenda una llamada',
  },
};
