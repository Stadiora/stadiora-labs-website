import { hrefFor } from '../data/nav';
import type { Locale } from '../i18n';

export type ContactTopic = 'demo' | 'question';

/** Every "Book a demo" and "Talk to us" link goes to the contact page with the topic preselected. */
export function contactHref(locale: Locale, topic: ContactTopic): string {
  return `${hrefFor('contact', locale)}?topic=${topic}`;
}

/** The existing standalone investors page stays as-is at cutover (DECISIONS #12), so it is linked, not rebuilt. */
export const investorsHref = '/investors.html';
