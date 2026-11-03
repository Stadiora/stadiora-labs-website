// Copy for the home brand strip "SPORT" moment (round-4 Floodlight). EN and ES.
export interface HomeBrandCopy {
  eyebrow: string;
  title: string;
  text: string;
  cta: string;
  /** Spoken name for the giant SPORT letters (the letters themselves are decorative). */
  giantLabel: string;
  meta: [string, string];
  tickerLabel: string;
  ticker: string[];
  /** Alt text for the eight retro images shown in the letter O, keyed by the image slug. */
  alts: Record<'tennis-ball' | 'starting-block' | 'traffic-light' | 'stopwatch' | 'jersey-crest' | 'lifting-belt' | 'pennant' | 'bottle-cones', string>;
}

const en: HomeBrandCopy = {
  eyebrow: 'Where we train',
  title: 'Built where sport happens.',
  text: 'On the track, the pitch, the weight room and the school field. Wherever your athletes train, Aria is already there.',
  cta: 'Find your fit',
  giantLabel: 'Sport',
  meta: ['Track / Pitch / Gym / School', 'Stadiora · Aria'],
  tickerLabel: 'Places athletes train',
  ticker: ['Track', 'Pitch', 'Weight room', 'School field', 'Gym', 'Kitchen'],
  alts: {
    'tennis-ball': 'Tennis ball against a racket',
    'starting-block': 'Starting block',
    'traffic-light': 'Traffic light outside a stadium',
    stopwatch: 'Stopwatch in a hand',
    'jersey-crest': 'Jersey with a crest',
    'lifting-belt': 'Lifting belt',
    pennant: 'Pennant on a locker-room wall',
    'bottle-cones': 'Water bottle and cones',
  },
};

const es: HomeBrandCopy = {
  eyebrow: 'Dónde entrenamos',
  title: 'Hecho donde ocurre el deporte.',
  text: 'En la pista, la cancha, la sala de pesas y el campo del colegio. Dondequiera que entrenen tus atletas, Aria ya está ahí.',
  cta: 'Encuentra tu solución',
  giantLabel: 'Sport',
  meta: ['Pista / Cancha / Gimnasio / Colegio', 'Stadiora · Aria'],
  tickerLabel: 'Lugares donde entrenan los atletas',
  ticker: ['Pista', 'Cancha', 'Sala de pesas', 'Campo del colegio', 'Gimnasio', 'Cocina'],
  alts: {
    'tennis-ball': 'Pelota de tenis contra una raqueta',
    'starting-block': 'Taco de salida',
    'traffic-light': 'Semáforo frente a un estadio',
    stopwatch: 'Cronómetro en una mano',
    'jersey-crest': 'Camiseta con escudo',
    'lifting-belt': 'Cinturón de levantamiento',
    pennant: 'Banderín en la pared de un vestuario',
    'bottle-cones': 'Botella de agua y conos',
  },
};

export const homeBrand: { en: HomeBrandCopy; es: HomeBrandCopy } = { en, es };
