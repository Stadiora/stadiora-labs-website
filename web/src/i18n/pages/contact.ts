// Copy for /contact/ (DESIGN-2.md section 14, DECISIONS #16). EN and ES.
// The form posts to the live endpoint (site.contactApi). Success shows only on a 202; every other outcome has its own message.
// The role and athletes values are the endpoint's enums; the labels are what the visitor reads.
const en = {
  meta: {
    title: 'Contact | Let’s talk | Stadiora Labs',
    description: 'Book a demo or ask us anything about Aria for coaches, schools and clubs. Write to us or chat on WhatsApp.',
  },
  title: 'Let’s talk.',
  sub: 'Book a demo or ask us anything.',
  topicLabel: 'What would you like to do?',
  topics: { demo: 'Book a demo', question: 'Ask a question' },
  fields: {
    name: { label: 'Name', placeholder: 'Your name' },
    email: { label: 'Work email', placeholder: 'you@organization.com' },
    role: {
      label: 'Your role',
      placeholder: 'Choose your role',
      options: [
        { value: 'coach', label: 'Coach' },
        { value: 'athletic-director', label: 'Athletic director' },
        { value: 'school-admin', label: 'School administrator' },
        { value: 'club-academy', label: 'Club or academy' },
        { value: 'gym', label: 'Gym or studio' },
        { value: 'athlete', label: 'Athlete or parent' },
        { value: 'other', label: 'Other' },
      ],
    },
    org: { label: 'Organization', placeholder: 'Your school or organization' },
    athletes: {
      label: 'Number of athletes',
      placeholder: 'Choose a range',
      options: [
        { value: '1-10', label: '1 to 10' },
        { value: '11-25', label: '11 to 25' },
        { value: '26-100', label: '26 to 100' },
        { value: '100-250', label: '100 to 250' },
        { value: '250-1000', label: '250 to 1,000' },
        { value: '1000+', label: 'More than 1,000' },
      ],
    },
    message: { demo: 'What would you like to see?', question: 'Your question', placeholder: 'Tell us about your program' },
  },
  errors: {
    name: 'Enter your name.',
    email: 'Enter a valid email address.',
    role: 'Choose your role.',
  },
  submit: { demo: 'Send request', question: 'Send' },
  note: 'We only use this to reply to you.',
  privacy: 'Privacy',
  // One message per outcome. The three failure messages end in a colon: the direct email and WhatsApp links follow them.
  send: {
    busy: 'Sending…',
    ok: 'Your message was sent. Thank you, we will reply to the email you gave.',
    invalid: 'We could not accept that. Check your details and try again, or reach us directly:',
    limited: 'Too many messages from this connection for now. Try again in a little while, or reach us directly:',
    unavailable: 'We could not send your message right now. Try again, or reach us directly:',
    noscript: 'This form needs JavaScript. To reach us directly, use the details on this page.',
  },
  chat: { title: 'Reach us directly', whatsapp: 'WhatsApp', email: 'Email' },
};

export type ContactCopy = typeof en;

const es: ContactCopy = {
  meta: {
    title: 'Contacto | Hablemos | Stadiora Labs',
    description: 'Agenda una demo o pregúntanos lo que quieras sobre Aria para entrenadores, colegios y clubes. Escríbenos o chatea por WhatsApp.',
  },
  title: 'Hablemos.',
  sub: 'Agenda una demo o pregúntanos lo que quieras.',
  topicLabel: 'Qué quieres hacer?',
  topics: { demo: 'Agenda una demo', question: 'Haz una pregunta' },
  fields: {
    name: { label: 'Nombre', placeholder: 'Tu nombre' },
    email: { label: 'Correo de trabajo', placeholder: 'tu@organizacion.com' },
    role: {
      label: 'Tu rol',
      placeholder: 'Elige tu rol',
      options: [
        { value: 'coach', label: 'Entrenador' },
        { value: 'athletic-director', label: 'Director deportivo' },
        { value: 'school-admin', label: 'Administrador escolar' },
        { value: 'club-academy', label: 'Club o academia' },
        { value: 'gym', label: 'Gimnasio o estudio' },
        { value: 'athlete', label: 'Atleta o padre/madre' },
        { value: 'other', label: 'Otro' },
      ],
    },
    org: { label: 'Organización', placeholder: 'Tu colegio u organización' },
    athletes: {
      label: 'Número de atletas',
      placeholder: 'Elige un rango',
      options: [
        { value: '1-10', label: '1 a 10' },
        { value: '11-25', label: '11 a 25' },
        { value: '26-100', label: '26 a 100' },
        { value: '100-250', label: '100 a 250' },
        { value: '250-1000', label: '250 a 1.000' },
        { value: '1000+', label: 'Más de 1.000' },
      ],
    },
    message: { demo: 'Qué te gustaría ver?', question: 'Tu pregunta', placeholder: 'Cuéntanos sobre tu programa' },
  },
  errors: {
    name: 'Escribe tu nombre.',
    email: 'Escribe un correo válido.',
    role: 'Elige tu rol.',
  },
  submit: { demo: 'Enviar solicitud', question: 'Enviar' },
  note: 'Solo usamos esto para responderte.',
  privacy: 'Privacidad',
  send: {
    busy: 'Enviando…',
    ok: 'Tu mensaje fue enviado. Gracias, te responderemos al correo que indicaste.',
    invalid: 'No pudimos aceptarlo. Revisa tus datos e inténtalo de nuevo, o escríbenos directamente:',
    limited: 'Demasiados mensajes desde esta conexión por ahora. Inténtalo de nuevo en un rato, o escríbenos directamente:',
    unavailable: 'No pudimos enviar tu mensaje ahora. Inténtalo de nuevo, o escríbenos directamente:',
    noscript: 'Este formulario necesita JavaScript. Para escribirnos directamente, usa los datos de esta página.',
  },
  chat: { title: 'Escríbenos directamente', whatsapp: 'WhatsApp', email: 'Correo' },
};

export const contact: { en: ContactCopy; es: ContactCopy } = { en, es };
