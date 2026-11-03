// The honest-contact contract, written out here on purpose and NOT imported from src/i18n/pages/contact.ts.
// Nothing is delivered from the contact page: a valid submit only opens the visitor's email app with the message
// filled in. If the app copy is edited, these literals must be edited too, so the change is reviewed twice.
// Used by verify-solutions.mjs (built HTML) and solutions-checks.mjs (the page in Chromium).

export const CONTACT_EMAIL = 'anthony@stadioralabs.com';

// The only post-submit status text. "{email}" is replaced with CONTACT_EMAIL when the form is submitted.
export const approvedOpening = {
  en: 'Opening your email app. If nothing opens, write to {email}.',
  es: 'Abriendo tu app de correo. Si no se abre, escribe a {email}.',
};

// The only other sentence about sending. It says the opposite of a delivery claim, so it is stripped before scanning.
export const approvedNote = {
  en: 'Sending opens your email app with your message ready. Nothing is sent from this page.',
  es: 'Al enviar se abre tu app de correo con el mensaje listo. Desde esta página no se envía nada.',
};

export const statusText = (locale) => approvedOpening[locale].replace('{email}', CONTACT_EMAIL);

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

// Removes the approved sentences, then lists every delivery claim left in the text.
export function findDeliveryClaims(text, locale) {
  let rest = text.replace(/\s+/g, ' ');
  for (const sentence of [approvedNote[locale], statusText(locale), approvedOpening[locale]]) rest = rest.replaceAll(sentence, ' ');
  return deliveryClaims.filter(([re]) => re.test(rest)).map(([, what]) => what);
}
