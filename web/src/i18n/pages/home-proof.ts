// Copy for the home proof section: one real quote from Marco Saenz, a Stadiora advisor.
export interface HomeProofCopy {
  eyebrow: string;
  /** Two display lines. */
  title: [string, string];
  /** The three outline words behind the card. */
  outline: [string, string, string];
  quote: string;
  /** Words (lower case, with their punctuation) that light up mint. */
  highlight: string[];
  name: string;
  role: string;
  chip: string;
  initials: string;
  photoAlt: string;
  story: { title: string; text: string; cta: string };
}

const en: HomeProofCopy = {
  eyebrow: 'In their words',
  title: ['Straight from', 'the track.'],
  outline: ['Training', 'Nutrition', 'Competition'],
  quote: 'Aria helped me optimize training, nutrition and competition.',
  highlight: ['training,', 'nutrition', 'competition.'],
  name: 'Marco Saenz',
  role: 'M45 national champion',
  chip: 'Stadiora advisor',
  initials: 'MS',
  photoAlt: 'Stand-in photo: a masters sprinter seen from behind, walking down the track after a race.',
  story: {
    title: 'Coaching on Aria?',
    text: 'Tell us how it’s going. Your story could be the next one here.',
    cta: 'Share your story',
  },
};

const es: HomeProofCopy = {
  eyebrow: 'En sus palabras',
  title: ['Directo desde', 'la pista.'],
  outline: ['Entrenamiento', 'Nutrición', 'Competencia'],
  quote: 'Aria me ayudó a optimizar mi entrenamiento, nutrición y competencia.',
  highlight: ['entrenamiento,', 'nutrición', 'competencia.'],
  name: 'Marco Saenz',
  role: 'Campeón nacional M45',
  chip: 'Asesor de Stadiora',
  initials: 'MS',
  photoAlt: 'Foto de referencia: un velocista máster visto de espaldas, caminando por la pista después de una carrera.',
  story: {
    title: 'Tu historia con Aria',
    text: 'Cuéntanos cómo te va. Tu historia podría ser la próxima que aparezca aquí.',
    cta: 'Comparte tu historia',
  },
};

export const homeProof: { en: HomeProofCopy; es: HomeProofCopy } = { en, es };
