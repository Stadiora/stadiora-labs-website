// Copy shared by the solutions, resources and company pages, plus alt text for the photos they add.
import type { Locale } from '../index';

type Pair<T> = Record<Locale, T>;

export const common: Pair<{
  seePricing: string;
  startFree: string;
  bookDemo: string;
  bookSchoolDemo: string;
  talkToUs: string;
  demoCaption: string;
  demoTag: string;
  eyebrowSolutions: string;
  ctaTitle: string;
  breadcrumbHome: string;
}> = {
  en: {
    seePricing: 'See pricing',
    startFree: 'Start free',
    bookDemo: 'Book a demo',
    bookSchoolDemo: 'Book a school demo',
    talkToUs: 'Talk to us',
    demoCaption: 'Demo data: a fictional coach and team.',
    demoTag: 'Demo',
    eyebrowSolutions: 'Solutions',
    ctaTitle: 'Ready when your season is.',
    breadcrumbHome: 'Home',
  },
  es: {
    seePricing: 'Ver precios',
    startFree: 'Empieza gratis',
    bookDemo: 'Agenda una demo',
    bookSchoolDemo: 'Agenda una demo escolar',
    talkToUs: 'Habla con nosotros',
    demoCaption: 'Datos de demostración: un entrenador y un equipo ficticios.',
    demoTag: 'Demo',
    eyebrowSolutions: 'Soluciones',
    ctaTitle: 'Listos cuando empiece tu temporada.',
    breadcrumbHome: 'Inicio',
  },
};

/** Alt text for the photos added by these pages (asset MANIFEST.md, EN and ES). */
export const photoAlt: Record<string, Pair<string>> = {
  's1-schools': {
    en: "A girls' soccer team with the coach and athletic director on a school field.",
    es: 'Equipo femenil de fútbol con la entrenadora y el director deportivo en el campo escolar.',
  },
  's2-coaches': {
    en: 'A woman coach and a teenage runner look at her phone together on a track at golden hour.',
    es: 'Una entrenadora y un corredor adolescente miran juntos su teléfono en una pista al atardecer.',
  },
  'a1-athletes-sprinter': {
    en: 'A teenage sprinter set in the starting blocks at golden hour.',
    es: 'Una velocista adolescente lista en los tacos de salida al atardecer.',
  },
  'a2-athletes-dribbling': {
    en: 'A teenage boy dribbles a soccer ball past a cone on a club pitch in the late afternoon.',
    es: 'Un adolescente conduce un balón de fútbol junto a un cono en una cancha de club al final de la tarde.',
  },
  'a3-athletes-row': {
    en: 'A young man does a one-arm dumbbell row in a strength room.',
    es: 'Un joven hace un remo con mancuerna a una mano en una sala de fuerza.',
  },
  'a4-athletes-cable': {
    en: 'A woman in her thirties does a seated cable row at a gym.',
    es: 'Una mujer de unos treinta años hace un remo sentado en polea en un gimnasio.',
  },
  'c1-about-track': {
    en: 'A public athletics track at golden hour seen from the stands, green mountains behind and a few athletes training far away.',
    es: 'Una pista pública de atletismo vista desde las gradas al atardecer, con montañas verdes al fondo y algunos atletas entrenando a lo lejos.',
  },
  'c2-contact-coach': {
    en: 'A relaxed coach with a whistle and clipboard takes a phone call at the edge of a track.',
    es: 'Un entrenador relajado, con silbato y tablilla, atiende una llamada en el borde de una pista.',
  },
};

export const altFor = (slot: string, locale: Locale): string => photoAlt[slot]?.[locale] ?? '';
