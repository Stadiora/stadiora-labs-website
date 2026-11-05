// Copy for /contact/ (DESIGN-2.md section 14, DECISIONS #16). EN and ES.
// There is no form endpoint yet, so sending opens the visitor's email app. The copy says so plainly.
const en = {
  meta: {
    title: 'Contact | Let’s talk | Stadiora Labs',
    description: 'Book a call or ask us anything about Aria for coaches, schools and clubs. Write to us or chat on WhatsApp.',
  },
  title: 'Let’s talk.',
  sub: 'Book a call or ask us anything.',
  topicLabel: 'What would you like to do?',
  topics: { call: 'Book a call', question: 'Ask a question' },
  fields: {
    name: { label: 'Name', placeholder: 'Your name' },
    email: { label: 'Work email', placeholder: 'you@organization.com' },
    role: {
      label: 'Your role',
      placeholder: 'Choose your role',
      options: [
        { value: 'coach', label: 'Coach' },
        { value: 'athletic-director', label: 'Athletic director' },
        { value: 'club-academy', label: 'Club or academy' },
        { value: 'gym-studio', label: 'Gym or studio' },
        { value: 'nutrition-coach', label: 'Nutrition coach' },
        { value: 'athlete-parent', label: 'Athlete or parent' },
        { value: 'other', label: 'Other' },
      ],
    },
    org: { label: 'Organization', placeholder: 'Your school or organization' },
    athletes: {
      label: 'Number of athletes',
      placeholder: 'Choose a range',
      options: ['1 to 10', '11 to 25', '26 to 100', '100 to 250', '250 to 1,000', 'More than 1,000'],
    },
    message: { call: 'What would you like to see?', question: 'Your question', placeholder: 'Tell us about your program' },
  },
  errors: {
    name: 'Enter your name.',
    email: 'Enter a valid email address.',
    role: 'Choose your role.',
  },
  submit: { call: 'Send request', question: 'Send' },
  note: 'We only use this to reply to you.',
  privacy: 'Privacy',
  mailtoNote: 'Sending opens your email app with your message ready. Nothing is sent from this page.',
  opening: 'Opening your email app. If nothing opens, write to {email}.',
  mail: {
    callSubject: 'Call request from {name}',
    questionSubject: 'Question from {name}',
    labels: { name: 'Name', email: 'Email', role: 'Role', org: 'Organization', athletes: 'Number of athletes' },
  },
  chat: { title: 'Prefer to chat?', whatsapp: 'WhatsApp', email: 'Email' },
};

export type ContactCopy = typeof en;

const es: ContactCopy = {
  meta: {
    title: 'Contacto | Hablemos | Stadiora Labs',
    description: 'Agenda una llamada o pregúntanos lo que quieras sobre Aria para entrenadores, colegios y clubes. Escríbenos o chatea por WhatsApp.',
  },
  title: 'Hablemos.',
  sub: 'Agenda una llamada o pregúntanos lo que quieras.',
  topicLabel: 'Qué quieres hacer?',
  topics: { call: 'Agenda una llamada', question: 'Haz una pregunta' },
  fields: {
    name: { label: 'Nombre', placeholder: 'Tu nombre' },
    email: { label: 'Correo de trabajo', placeholder: 'tu@organizacion.com' },
    role: {
      label: 'Tu rol',
      placeholder: 'Elige tu rol',
      options: [
        { value: 'coach', label: 'Entrenador' },
        { value: 'athletic-director', label: 'Director deportivo' },
        { value: 'club-academy', label: 'Club o academia' },
        { value: 'gym-studio', label: 'Gimnasio o estudio' },
        { value: 'nutrition-coach', label: 'Entrenador de nutrición' },
        { value: 'athlete-parent', label: 'Atleta o padre/madre' },
        { value: 'other', label: 'Otro' },
      ],
    },
    org: { label: 'Organización', placeholder: 'Tu colegio u organización' },
    athletes: {
      label: 'Número de atletas',
      placeholder: 'Elige un rango',
      options: ['1 a 10', '11 a 25', '26 a 100', '100 a 250', '250 a 1.000', 'Más de 1.000'],
    },
    message: { call: 'Qué te gustaría ver?', question: 'Tu pregunta', placeholder: 'Cuéntanos sobre tu programa' },
  },
  errors: {
    name: 'Escribe tu nombre.',
    email: 'Escribe un correo válido.',
    role: 'Elige tu rol.',
  },
  submit: { call: 'Enviar solicitud', question: 'Enviar' },
  note: 'Solo usamos esto para responderte.',
  privacy: 'Privacidad',
  mailtoNote: 'Al enviar se abre tu app de correo con el mensaje listo. Desde esta página no se envía nada.',
  opening: 'Abriendo tu app de correo. Si no se abre, escribe a {email}.',
  mail: {
    callSubject: 'Solicitud de llamada de {name}',
    questionSubject: 'Pregunta de {name}',
    labels: { name: 'Nombre', email: 'Correo', role: 'Rol', org: 'Organización', athletes: 'Número de atletas' },
  },
  chat: { title: 'Prefieres chatear?', whatsapp: 'WhatsApp', email: 'Correo' },
};

export const contact: { en: ContactCopy; es: ContactCopy } = { en, es };
