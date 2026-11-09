// Copy for /about/ (DESIGN-2.md section 13, DECISIONS #15). EN and ES.
// Bios are the live team page's wording, kept verbatim. All 12 people are listed.
export interface Person {
  id: string;
  name: string;
  role: string;
  bio: string;
  /** Profile link; people without a public profile omit it and the card shows no link. */
  href?: string;
  /** Portraits exist only for four people. The rest use initials, never a generated face. */
  portrait?: 'anthony' | 'ian' | 'joel';
}

const links = {
  anthony: 'https://www.linkedin.com/in/anthonyrugama',
  ian: 'https://www.linkedin.com/in/irowe12',
  joel: 'https://www.transfermarkt.com/joel-campbell/profil/spieler/131248',
  michelle: 'https://www.linkedin.com/in/michelle-allen-cr',
  marco: 'https://www.linkedin.com/in/marco-saenz-605aba42',
  katherine: 'https://www.linkedin.com/in/katherine-vega-r-663652223',
  julian: 'https://www.linkedin.com/in/julian-wais-83758b234',
  ivana: 'https://www.linkedin.com/in/ivana-guerra-341576376',
  cristhian: 'https://www.linkedin.com/in/cristhian-jos%C3%A9-monge-arce-bds/',
  luigi: 'https://www.linkedin.com/in/luigia/',
  charlie: 'https://www.linkedin.com/in/charlie-quiros-6504a7231/',
};

const en = {
  meta: {
    title: 'About | Stadiora Labs',
    description:
      'Stadiora Labs builds performance intelligence for the people who coach. Meet the engineers, scientists, coaches and athletes behind Aria.',
  },
  eyebrow: 'About',
  title: 'We build for the people who coach.',
  sub: "We're engineers, scientists, coaches and athletes in Latin America and the United States, building the tools we wished we had.",
  mission: 'Our mission: make elite-level performance intelligence accessible to everyone.',
  values: [
    { id: 'science', title: 'Science over hype', text: 'Evidence-driven, never hype.' },
    { id: 'coaches', title: 'Built with coaches', text: 'Created with coaches and athletes.' },
    { id: 'access', title: 'Access for all', text: 'Elite tools without the elite budget.' },
  ],
  team: {
    title: 'The team',
    hint: 'Select a name to read a short bio.',
    linkLabel: 'Profile',
    close: 'Close',
    people: [
      {
        id: 'anthony',
        name: 'Anthony Rugama Brown',
        role: 'Co-founder and CEO',
        bio: 'Microsoft engineer, former Olympic-level athlete, and AI researcher. Built Stadiora to make elite sports intelligence accessible to every athlete.',
        href: links.anthony,
        portrait: 'anthony',
      },
      {
        id: 'ian',
        name: 'Ian Phillip Rowe Rojas',
        role: 'Co-founder and CTO',
        bio: 'Full-stack architect designing the data infrastructure and AI engine powering the Stadiora ecosystem.',
        href: links.ian,
        portrait: 'ian',
      },
      {
        id: 'brandon',
        name: 'Brandon Heredia',
        role: 'Chief Performance Officer',
        bio: "Mexican Olympic athlete with a master's in high performance.",
      },
      {
        id: 'joel',
        name: 'Joel Campbell',
        role: 'Strategic equity partner, Aria 12',
        bio: 'Costa Rican international footballer and Arsenal alum bringing elite sport credibility as a strategic equity partner in Aria 12.',
        href: links.joel,
        portrait: 'joel',
      },
      {
        id: 'michelle',
        name: 'Michelle Allen',
        role: 'Project attorney',
        bio: "Legal counsel overseeing IP, corporate structure, and compliance across Stadiora's operations in Latin America and the US.",
        href: links.michelle,
      },
      {
        id: 'marco',
        name: 'Marco Saenz',
        role: 'Operations and community lead',
        bio: "Drives operational growth and community-building across Stadiora's emerging market partnerships.",
        href: links.marco,
      },
      {
        id: 'katherine',
        name: 'Katherine Vega',
        role: 'Performance and rehab advisor',
        bio: 'Physical therapist specializing in injury prevention, athlete recovery, and return-to-sport protocols.',
        href: links.katherine,
      },
      {
        id: 'julian',
        name: 'Julián Wais',
        role: 'Human movement and osteopathy advisor',
        bio: 'Expert in human movement and osteopathy, bridging clinical insight with high-performance athletic training protocols.',
        href: links.julian,
      },
      {
        id: 'ivana',
        name: 'Ivana Guerra',
        role: 'Sports psychology advisor',
        bio: 'Sports psychologist focused on mental performance, resilience, and cognitive readiness in competitive environments.',
        href: links.ivana,
      },
      {
        id: 'cristhian',
        name: 'Cristhian Monge Arce',
        role: 'Early investor',
        bio: 'Foundational early believer who helped make Stadiora Labs possible from day one.',
        href: links.cristhian,
      },
      {
        id: 'luigi',
        name: 'Luigi Allen',
        role: 'Caribbean partnerships lead',
        bio: "Building Stadiora's regional footprint across the Caribbean through strategic athlete and organizational partnerships.",
        href: links.luigi,
      },
      {
        id: 'charlie',
        name: 'Dr. Charlie Quirós',
        role: 'Training and nutrition expert',
        bio: 'Sports scientist combining exercise physiology and nutritional strategy to optimize athlete performance and body composition.',
        href: links.charlie,
      },
    ] as Person[],
  },
  work: {
    title: 'Work with us',
    text: 'Coaches, schools and clubs, partners and investors: start a conversation.',
    contact: 'Contact us',
  },
};

export type AboutCopy = typeof en;

const es: AboutCopy = {
  meta: {
    title: 'Nosotros | Stadiora Labs',
    description:
      'Stadiora Labs crea inteligencia de rendimiento para quienes entrenan. Conoce a los ingenieros, científicos, entrenadores y atletas detrás de Aria.',
  },
  eyebrow: 'Nosotros',
  title: 'Creamos para quienes entrenan.',
  sub: 'Somos ingenieros, científicos, entrenadores y atletas en América Latina y Estados Unidos, creando las herramientas que nos hubiera gustado tener.',
  mission: 'Nuestra misión: que la inteligencia de rendimiento de élite esté al alcance de todos.',
  values: [
    { id: 'science', title: 'Ciencia, no humo', text: 'Basados en evidencia, nunca en promesas vacías.' },
    { id: 'coaches', title: 'Hecho con entrenadores', text: 'Creado con entrenadores y atletas.' },
    { id: 'access', title: 'Acceso para todos', text: 'Herramientas de élite sin presupuesto de élite.' },
  ],
  team: {
    title: 'El equipo',
    hint: 'Elige un nombre para leer una biografía breve.',
    linkLabel: 'Perfil',
    close: 'Cerrar',
    people: [
      {
        id: 'anthony',
        name: 'Anthony Rugama Brown',
        role: 'Cofundador y CEO',
        bio: 'Ingeniero de Microsoft, exatleta olímpico e investigador de IA. Construyó Stadiora para acercar la inteligencia deportiva de élite a cada atleta.',
        href: links.anthony,
        portrait: 'anthony',
      },
      {
        id: 'ian',
        name: 'Ian Phillip Rowe Rojas',
        role: 'Cofundador y CTO',
        bio: 'Arquitecto full-stack diseñando la infraestructura de datos y el motor de IA que impulsa el ecosistema Stadiora.',
        href: links.ian,
        portrait: 'ian',
      },
      {
        id: 'brandon',
        name: 'Brandon Heredia',
        role: 'Director de Rendimiento',
        bio: 'Atleta olímpico mexicano con maestría en alto rendimiento.',
      },
      {
        id: 'joel',
        name: 'Joel Campbell',
        role: 'Socio estratégico de capital, Aria 12',
        bio: 'Futbolista internacional costarricense y exjugador del Arsenal. Socio de capital estratégico que aporta credibilidad deportiva de élite a Aria 12.',
        href: links.joel,
        portrait: 'joel',
      },
      {
        id: 'michelle',
        name: 'Michelle Allen',
        role: 'Abogada del proyecto',
        bio: 'Asesora legal que supervisa la propiedad intelectual, la estructura corporativa y el cumplimiento normativo en las operaciones de Stadiora.',
        href: links.michelle,
      },
      {
        id: 'marco',
        name: 'Marco Saenz',
        role: 'Operaciones y comunidad',
        bio: 'Impulsa el crecimiento operativo y la construcción de comunidad en las alianzas de Stadiora en mercados emergentes.',
        href: links.marco,
      },
      {
        id: 'katherine',
        name: 'Katherine Vega',
        role: 'Asesora de rendimiento y rehabilitación',
        bio: 'Fisioterapeuta especializada en prevención de lesiones, recuperación del atleta y protocolos de retorno al deporte.',
        href: links.katherine,
      },
      {
        id: 'julian',
        name: 'Julián Wais',
        role: 'Asesor en movimiento humano y osteopatía',
        bio: 'Experto en movimiento humano y osteopatía, conectando la visión clínica con protocolos de entrenamiento de alto rendimiento.',
        href: links.julian,
      },
      {
        id: 'ivana',
        name: 'Ivana Guerra',
        role: 'Asesora de psicología deportiva',
        bio: 'Psicóloga deportiva enfocada en el rendimiento mental, la resiliencia y la preparación cognitiva en entornos competitivos.',
        href: links.ivana,
      },
      {
        id: 'cristhian',
        name: 'Cristhian Monge Arce',
        role: 'Inversionista temprano',
        bio: 'Creyente fundacional que ayudó a hacer posible Stadiora Labs desde el primer día.',
        href: links.cristhian,
      },
      {
        id: 'luigi',
        name: 'Luigi Allen',
        role: 'Líder de alianzas en el Caribe',
        bio: 'Construyendo la presencia regional de Stadiora en el Caribe a través de alianzas estratégicas con atletas y organizaciones deportivas.',
        href: links.luigi,
      },
      {
        id: 'charlie',
        name: 'Dr. Charlie Quirós',
        role: 'Experto en entrenamiento físico y nutrición',
        bio: 'Científico deportivo que combina fisiología del ejercicio y estrategia nutricional para optimizar el rendimiento y la composición corporal del atleta.',
        href: links.charlie,
      },
    ],
  },
  work: {
    title: 'Trabaja con nosotros',
    text: 'Entrenadores, colegios y clubes, aliados e inversionistas: empecemos a conversar.',
    contact: 'Contáctanos',
  },
};

export const about: { en: AboutCopy; es: AboutCopy } = { en, es };
