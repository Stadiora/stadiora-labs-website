import { localePath, type Locale } from '../../i18n';

export type ContactTopic = 'call' | 'question';

/**
 * DESIGN-2 section 0.4: every "Book a call" call to action goes to the localized contact page with `?topic=call`,
 * and "Talk to us" with `?topic=question`. The path is built here, not read from `routes.contact`, so these
 * links do not depend on which open PR currently owns the contact route.
 */
export function contactHref(locale: Locale, topic: ContactTopic): string {
  return `${localePath('/contact/', locale)}?topic=${topic}`;
}
