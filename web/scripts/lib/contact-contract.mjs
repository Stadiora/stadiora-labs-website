// The honest-contact contract, written out here on purpose and NOT imported from src/ (site.ts, the copy files or the form
// script). If the endpoint, the roles, a phone number or the wording of the success state changes in the app, these literals
// must change too, so the change is reviewed twice.
// Source of truth for the endpoint: Stadiora/Aria PR #16610 (app-backend/server/routes/websiteContact.ts, docs/api/website-contact.md).
// Used by verify-solutions.mjs and cutover-verify.mjs (built HTML), solutions-checks.mjs, solutions-floodlight-checks.mjs
// and cutover-checks.mjs (the pages in Chromium, with the network intercepted: nothing is ever really sent).

export const CONTACT_ENDPOINT = 'https://api.runwitharia.com/api/public/website-contact';

// Request body: exactly these keys, plus the optional organization and athletes when the visitor filled them.
export const requiredKeys = ['topic', 'name', 'email', 'role', 'message', 'locale', 'page', 'website', 'startedAt'];
export const optionalKeys = ['organization', 'athletes'];
// The endpoint's topic enum is fixed (backend, out of scope). The page's topics are `call` and `question`; the form maps
// `call` to the enum value below at the one place it builds the body, and the browser checks assert that exact wire value.
export const wireTopic = { call: 'demo', question: 'question' };
export const topics = Object.values(wireTopic);
export const roles = ['coach', 'athletic-director', 'school-admin', 'club-academy', 'gym', 'athlete', 'other'];
export const athleteRanges = ['1-10', '11-25', '26-100', '100-250', '250-1000', '1000+'];
// The endpoint rejects a post made less than this long after startedAt (the moment the form opened).
export const MIN_FILL_MS = 3000;

// Both regions, on the Contact page, in the footer and on connect.html.
export const contacts = {
  us: { name: 'Ian Rowe', email: 'ian@stadioralabs.com', tel: '+18592859529', phone: '+1 859 285 9529' },
  latam: { name: 'Anthony', email: 'anthony@stadioralabs.com', tel: '+50660419069', phone: '+506 6041-9069', whatsapp: 'https://wa.me/50660419069' },
};
export const contactHrefs = [
  `mailto:${contacts.us.email}`,
  `tel:${contacts.us.tel}`,
  `mailto:${contacts.latam.email}`,
  `tel:${contacts.latam.tel}`,
  contacts.latam.whatsapp,
];

// The hrefs from contactHrefs that the given HTML does not carry.
export const missingContactHrefs = (html, hrefs = contactHrefs) => hrefs.filter((h) => !html.includes(`href="${h}"`));

// The only status text that may claim a message went out. It appears after a 202 and nowhere else.
export const approvedSuccess = {
  en: 'Your message was sent. Thank you, we will reply to the email you gave.',
  es: 'Tu mensaje fue enviado. Gracias, te responderemos al correo que indicaste.',
};

// The lead-magnet quiz keeps its own success panel; it too appears only after a 202.
export const leadSuccess = { en: /on the list/i, es: /en la lista/i };

// Phrases that claim a message was received, delivered or will be answered. English first, then Spanish
// (accented and unaccented spellings, because the page may drop accents).
export const deliveryClaims = [
  [/thank(s| you)/i, 'a thank-you'],
  [/got (your|the|it)\b/i, '"got your message"'],
  [/\b(we|i)(’|')?(ve| have)? (received|got)\b/i, '"we received/got"'],
  [/\b(received|receipt|delivered|delivery|submitted)\b/i, 'received, delivered or submitted'],
  [/\b(message|request|form|email) (was |has been |is )?(sent|received|delivered|submitted)\b/i, '"message sent"'],
  [/\bsent\b/i, '"sent"'],
  [/\b(we(’|')?ll|we will) (reply|respond|be in touch|get back|contact|call)\b/i, 'a promise to reply'],
  [/\bget back to you\b|\bbe in touch\b/i, 'a promise to reply'],
  [/\bwithin \d+|\b24 ?h(ours?)?\b|\b(one|1) business day/i, 'a reply-time promise'],
  [/\bsuccess(ful|fully)?\b/i, 'a success state'],
  [/gracias/i, 'a thank-you (Spanish)'],
  [/recib(imos|ido|ida|idos|idas|iste|í|iremos|irás)/i, '"recibimos / recibido"'],
  [/\benviad[oa]s?\b/i, '"enviado"'],
  [/\benviamos\b/i, '"enviamos"'],
  [/\b(fue|ha sido|ya está|esta) (enviad|recibid|entregad)/i, '"fue enviado"'],
  [/\bentregad[oa]s?\b|\bentrega\b/i, '"entregado"'],
  [/\b(te|le) (responderemos|contestaremos|contactaremos|escribiremos|llamaremos)\b/i, 'a promise to reply (Spanish)'],
  [/\bnos pondremos\b|\bte respondemos\b|\ben breve\b/i, 'a promise to reply (Spanish)'],
  [/\ben (menos de )?\d+ ?(h|horas?|d[ií]as?)\b|\bdentro de \d+/i, 'a reply-time promise (Spanish)'],
  [/\bcon [eé]xito|\bexitosamente\b/i, 'a success state (Spanish)'],
];

// Removes the approved success sentence, then lists every delivery claim left in the text.
export function findDeliveryClaims(text, locale) {
  let rest = text.replace(/\s+/g, ' ');
  rest = rest.replaceAll(approvedSuccess[locale], ' ');
  return deliveryClaims.filter(([re]) => re.test(rest)).map(([, what]) => what);
}
