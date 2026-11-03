import { en, type Dict } from './en';
import { es } from './es';

export const locales = ['en', 'es'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

const dictionaries: Record<Locale, Dict> = { en, es };

export function isLocale(value: string | undefined): value is Locale {
  return value === 'en' || value === 'es';
}

export function getLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : defaultLocale;
}

export function useDict(locale: string | undefined): Dict {
  return dictionaries[getLocale(locale)];
}

/** Locale-prefixed path: EN at /, ES at /es/. Paths ending in a file extension are returned unchanged. */
export function localePath(path: string, locale: Locale): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (/\.[a-z0-9]+$/i.test(clean) || clean.startsWith('/#')) return clean;
  if (locale === defaultLocale) return clean;
  return `/es${clean === '/' ? '/' : clean}`;
}

/** Strip the locale prefix so the same logical page can be addressed in either language. */
export function stripLocale(pathname: string): string {
  return pathname.replace(/^\/es(?=\/|$)/, '') || '/';
}

export const hreflangByLocale: Record<Locale, string> = { en: 'en', es: 'es' };
