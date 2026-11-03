import generatedAlt from './photo-alt.json';

export type PhotoLocale = 'en' | 'es';
type Alt = Record<PhotoLocale, string>;

/** Fallback alt text, used only for a slot missing from the asset MANIFEST. */
const fallbackAlt: Record<string, Alt> = {
  'h1-coaches-big': {
    en: 'A woman coach giving cues to a sprinter at the start line of a track, stopwatch in hand',
    es: 'Una entrenadora da indicaciones a una velocista en la línea de salida de una pista, con un cronómetro en la mano',
  },
  'h1-coaches-tile-sq': {
    en: "A coach's hands holding a phone with a training calendar",
    es: 'Las manos de un entrenador sostienen un teléfono con un calendario de entrenamiento',
  },
  'h1-coaches-tile-45': {
    en: 'An athlete nodding while listening to her coach',
    es: 'Una atleta asiente mientras escucha a su entrenador',
  },
  'h3-highschool-big': {
    en: 'A high school track team laughing around their coach on the field',
    es: 'Un equipo escolar de atletismo ríe alrededor de su entrenador en la pista',
  },
  'h3-highschool-tile-sq': {
    en: 'A teenage sprinter in the starting blocks with chalked hands',
    es: 'Una velocista adolescente en los tacos de salida, con las manos con tiza',
  },
  'h3-highschool-tile-45': {
    en: 'A coach on the sideline checking his phone',
    es: 'Un entrenador en la banda revisa su teléfono',
  },
  'h2-academies-big': {
    en: 'A youth soccer academy squad in a pre-match huddle',
    es: 'Un equipo de una academia juvenil de fútbol en un círculo antes del partido',
  },
  'h2-academies-tile-sq': {
    en: 'A soccer ball at a boot on wet grass',
    es: 'Un balón de fútbol junto a un botín sobre césped mojado',
  },
  'h2-academies-tile-45': {
    en: 'A soccer coach with a tactics board',
    es: 'Un entrenador de fútbol con una pizarra táctica',
  },
  'h4-track-big': {
    en: 'Track and field athletes warming up with their coach on the infield',
    es: 'Atletas de pista y campo calientan con su entrenador en el campo interior',
  },
  'h4-track-tile-sq': {
    en: 'A hurdler clearing a hurdle in training',
    es: 'Una vallista salta una valla durante el entrenamiento',
  },
  'h4-track-tile-45': {
    en: 'A jumper preparing for a run-up',
    es: 'Una saltadora se prepara para la carrera de impulso',
  },
  'h5-gyms-big': {
    en: 'A gym owner spotting a member during a squat',
    es: 'Una dueña de gimnasio asiste a una clienta durante una sentadilla',
  },
  'h5-gyms-tile-sq': {
    en: 'Chalk on a barbell knurling in close-up',
    es: 'Tiza sobre el moleteado de una barra, en primer plano',
  },
  'h5-gyms-tile-45': {
    en: 'A small group class lifting kettlebells',
    es: 'Una clase en grupo pequeño levanta pesas rusas',
  },
  'h6-nutrition-big': {
    en: 'A nutrition coach and an athlete preparing a meal at a kitchen counter',
    es: 'Una coach de nutrición y un atleta preparan una comida en la encimera de una cocina',
  },
  'h6-nutrition-tile-sq': {
    en: 'An overhead view of a plate being photographed with a phone',
    es: 'Vista cenital de un plato mientras se fotografía con un teléfono',
  },
  'h6-nutrition-tile-45': {
    en: "An athlete's hands packing a lunch box",
    es: 'Las manos de un atleta preparan una lonchera',
  },
  'h7-universities-big': {
    en: 'College athletes with a strength coach in a university weight room',
    es: 'Atletas universitarios con un preparador físico en la sala de pesas de una universidad',
  },
  'h7-universities-tile-sq': {
    en: 'A university athlete resting between sets',
    es: 'Un atleta universitario descansa entre series',
  },
  'h7-universities-tile-45': {
    en: 'A strength coach reviewing a plan on a tablet',
    es: 'Un preparador físico revisa un plan en una tableta',
  },
  'p1-training': {
    en: 'A woman middle-distance runner doing strides on a track at sunrise',
    es: 'Una corredora de medio fondo haciendo progresiones en una pista al amanecer',
  },
  'p2-nutrition': {
    en: 'An athlete logging a meal photo at a café table',
    es: 'Una atleta registrando la foto de una comida en la mesa de un café',
  },
  'p3-readiness': {
    en: 'An athlete lacing shoes on a bed at dawn',
    es: 'Una atleta atándose los zapatos sentada en la cama al amanecer',
  },
  'p4-team-coaching': {
    en: 'A soccer coach running a cone drill',
    es: 'Un entrenador de fútbol dirigiendo un ejercicio con conos',
  },
  'e1-engage': {
    en: 'A teenage soccer player sitting on the grass after training, checking her phone',
    es: 'Una futbolista adolescente sentada en el césped después del entrenamiento, mirando su teléfono',
  },
  'm1-coach': { en: 'A coach timing a sprinter', es: 'Un entrenador cronometrando a un velocista' },
  'm2-engage': { en: 'Teens gathered around a phone', es: 'Adolescentes reunidos alrededor de un teléfono' },
  'm3-manage': { en: 'An athletic director with a tablet in a gym', es: 'Un director deportivo con una tableta en un gimnasio' },
  'm4-scale': { en: 'A gym owner with a tablet in a strength room', es: 'Una dueña de gimnasio con una tableta en una sala de fuerza' },
};

/** Alt text per slot, EN and ES. `photo-alt.json` comes from the asset lane's MANIFEST.md. */
export const photoAlt: Record<string, Alt> = { ...fallbackAlt, ...(generatedAlt as Record<string, Alt>) };
