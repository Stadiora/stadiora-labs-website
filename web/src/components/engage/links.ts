import { localePath, type Locale } from '../../i18n';

export type ContactTopic = 'demo' | 'question';

/**
 * DESIGN-2 section 0.4: every demo call to action goes to the localized contact page with `?topic=demo`,
 * and "Talk to us" with `?topic=question`. The path is built here, not read from `routes.contact`, so these
 * links do not depend on which open PR currently owns the contact route.
 */
export function contactHref(locale: Locale, topic: ContactTopic): string {
  return `${localePath('/contact/', locale)}?topic=${topic}`;
}
