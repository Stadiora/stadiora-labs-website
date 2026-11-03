import { routes, site, type ItemId } from './site';
import { localePath, type Locale } from '../i18n';

export interface MegaColumn {
  key: 'coach' | 'engage' | 'manage' | 'scale';
  photo: string;
  items: ItemId[];
}

export const platformColumns: MegaColumn[] = [
  { key: 'coach', photo: 'm1-coach', items: ['programs', 'nutrition', 'readiness', 'powerlab'] },
  { key: 'engage', photo: 'm2-engage', items: ['messaging', 'guardian'] },
  { key: 'manage', photo: 'm3-manage', items: ['teams', 'reports'] },
  { key: 'scale', photo: 'm4-scale', items: ['branded', 'integrations'] },
];

export const solutionItems: ItemId[] = ['coaches', 'clubs', 'schools', 'athletes'];
export const resourceItems: ItemId[] = ['caseStudies', 'help', 'api'];

export const appLinks = [
  { key: 'run', href: site.stores.runIos, hrefAlt: site.stores.runAndroid, live: true },
  { key: 'aria12', href: null, hrefAlt: null, live: false },
  { key: 'lift', href: null, hrefAlt: null, live: false },
  { key: 'fitmg', href: site.stores.fitmgAndroid, hrefAlt: site.stores.fitmgIosBeta, live: true },
] as const;

export function hrefFor(id: keyof typeof routes, locale: Locale): string {
  const route = routes[id];
  if (route.status === 'legacy') return locale === 'es' && route.es ? route.es : route.path;
  return localePath(route.path, locale);
}
