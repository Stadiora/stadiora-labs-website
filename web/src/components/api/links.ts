import { localePath, type Locale } from '../../i18n';

/** Early access is an email to the API inbox. There is no signup form and no API key to request. */
export const apiLinks = (locale: Locale) =>
  ({
    mail: 'mailto:api@stadioralabs.com?subject=Aria%20Intelligence%20API%20early%20access',
    ask: localePath('/contact/?topic=question', locale),
    home: localePath('/', locale),
  }) as const;
