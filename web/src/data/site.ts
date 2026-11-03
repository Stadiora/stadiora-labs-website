/** Destinations shared by both languages. Paths marked `planned` belong to later slices of the epic. */
export const site = {
  name: 'Stadiora Labs',
  origin: 'https://stadioralabs.com',
  signIn: 'https://app.ariaforcoaches.com/login',
  signUp: 'https://app.ariaforcoaches.com/signup',
  // The published scheduling page from connect.html ("Schedule a Meeting").
  booking:
    'https://bookings.cloud.microsoft/bookwithme/user/0d09299a358447868cc84c1a06d8f5e6@stadioralabs.com?anonymous&ismsaljsauthenabled&ep=plink',
  // Contact details already published on connect.html (DECISIONS #6).
  email: 'anthony@stadioralabs.com',
  whatsappUrl: 'https://wa.me/50660419069',
  whatsappLabel: '+506 6041-9069',
  linkedin: 'https://www.linkedin.com/company/stadioralabs',
  stores: {
    runIos: 'https://apps.apple.com/app/id6760048203',
    runAndroid: 'https://play.google.com/store/apps/details?id=com.runwitharia.mobile',
    fitmgAndroid: 'https://play.google.com/store/apps/details?id=com.fitmg.stadiora',
    fitmgIosBeta: 'https://testflight.apple.com/join/eDc3hw5D',
  },
} as const;

export type ItemId =
  | 'programs'
  | 'nutrition'
  | 'readiness'
  | 'powerlab'
  | 'messaging'
  | 'guardian'
  | 'teams'
  | 'reports'
  | 'branded'
  | 'integrations'
  | 'coaches'
  | 'clubs'
  | 'schools'
  | 'athletes'
  | 'caseStudies'
  | 'help'
  | 'api';

export interface Route {
  /** Path without locale prefix. */
  path: string;
  /** `legacy`: a standalone page carried over unchanged at the same URL; `planned`: built in a later slice. */
  status: 'legacy' | 'planned';
  /** Locale-specific override for legacy pages that have a separate Spanish file. */
  es?: string;
}

export const routes: Record<ItemId | 'pricing' | 'solutions' | 'about' | 'contact' | 'privacy' | 'terms', Route> = {
  programs: { path: '/platform/programs/', status: 'planned' },
  nutrition: { path: '/platform/nutrition/', status: 'planned' },
  readiness: { path: '/platform/readiness/', status: 'planned' },
  powerlab: { path: '/platform/power-lab/', status: 'planned' },
  messaging: { path: '/platform/messaging/', status: 'planned' },
  guardian: { path: '/platform/guardian-portal/', status: 'planned' },
  teams: { path: '/platform/teams/', status: 'planned' },
  reports: { path: '/platform/teams/#reports', status: 'planned' },
  branded: { path: '/platform/custom-branded-apps/', status: 'planned' },
  integrations: { path: '/platform/integrations/', status: 'planned' },
  coaches: { path: '/solutions/coaches/', status: 'planned' },
  clubs: { path: '/solutions/teams-and-clubs/', status: 'planned' },
  schools: { path: '/solutions/schools/', status: 'planned' },
  athletes: { path: '/solutions/athletes/', status: 'planned' },
  caseStudies: { path: '/resources/case-studies/', status: 'planned' },
  help: { path: '/help/', status: 'planned' },
  api: { path: '/api.html', status: 'legacy', es: '/api-es.html' },
  pricing: { path: '/pricing/', status: 'planned' },
  solutions: { path: '/solutions/', status: 'planned' },
  about: { path: '/about/', status: 'planned' },
  contact: { path: '/connect.html', status: 'legacy' },
  privacy: { path: '/privacy.html', status: 'legacy' },
  terms: { path: '/terms.html', status: 'legacy' },
};
