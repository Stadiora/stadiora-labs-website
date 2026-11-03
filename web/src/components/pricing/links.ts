import { site } from '../../data/site';
import { hrefFor } from '../../data/nav';
import type { Locale } from '../../i18n';

/**
 * Where each pricing call to action goes. No checkout and no card form: collection is not live,
 * so Core and Performance send people to the coach sign-up and the plan is confirmed with them.
 */
export function pricingLinks(locale: Locale) {
  return {
    free: site.signUp,
    core: site.signUp,
    performance: site.signUp,
    schools: site.booking,
    talk: hrefFor('contact', locale),
  } as const;
}
