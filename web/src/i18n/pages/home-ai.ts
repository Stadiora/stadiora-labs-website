// Copy for the home "AI program builder" section (round-4 Floodlight). EN and ES.
// The stage is mock UI (aria-hidden); its text is translated too so the ES page shows no English.
export interface HomeAiCopy {
  eyebrow: string;
  /** One entry per display line of the h2. */
  title: [string, string, string];
  lead: string;
  /** Text description of the 12 s story for assistive tech. */
  story: string;
  stepsLabel: string;
  steps: { title: string; text: string }[];
  stage: {
    calendarTitle: string;
    range: [string, string, string];
    days: [string, string, string, string, string, string, string];
    weeks: [string, string];
    sessions: { acceleration: string; tempo: string; speedEndurance: string; raceModel: string };
    askBadge: string;
    askTitle: string;
    askText: string;
    prompt: [string, string];
    generate: string;
    programAccent: string;
    programTitle: string;
    programMeta: [string, string, string];
    addToCalendar: string;
    toast: string;
  };
}

const en: HomeAiCopy = {
  eyebrow: 'AI program builder',
  title: ['Ask for a program.', 'Review it. Send it', 'to the calendar.'],
  lead: "Aria drafts it. You make the calls. Then it lands on every athlete's calendar.",
  story:
    'The AI program builder at work. A coach asks Aria for an 8-week, 400 m speed-endurance block for a sprint group, 4 days a week. Aria drafts four sessions a week, the coach reviews them and adds the block to the calendar, and two weeks of sessions appear on the Sprint group calendar for its 18 athletes.',
  stepsLabel: 'How the AI program builder works',
  steps: [
    { title: 'Ask Aria', text: 'Describe the block in plain words.' },
    { title: 'Review the draft', text: 'Every session is yours to change.' },
    { title: 'Send it to the calendar', text: 'The whole group sees it in the app.' },
  ],
  stage: {
    calendarTitle: 'Sprint group · Calendar',
    range: ['1 week', '2 weeks', '4 weeks'],
    days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
    weeks: ['WEEK 1', 'WEEK 2'],
    sessions: { acceleration: 'Acceleration', tempo: 'Tempo', speedEndurance: 'Speed endurance', raceModel: 'Race model' },
    askBadge: 'Ask Aria',
    askTitle: "Let's build a program",
    askText: 'Describe the block. You review it.',
    prompt: ['8-week 400 m block for my sprint', 'group, 4 days a week. Meet on Dec 12.'],
    generate: 'Generate',
    programAccent: '400 m',
    programTitle: 'Speed Endurance',
    programMeta: ['8 weeks', '4 sessions/week', 'Sprint group'],
    addToCalendar: 'Add to calendar',
    toast: 'Sent to Sprint group · 18 athletes',
  },
};

const es: HomeAiCopy = {
  eyebrow: 'Creador de programas con IA',
  title: ['Pide un programa.', 'Revísalo. Envíalo', 'al calendario.'],
  lead: 'Aria lo redacta. Tú tomas las decisiones. Luego aparece en el calendario de cada atleta.',
  story:
    'El creador de programas con IA en acción. Una entrenadora le pide a Aria un bloque de 8 semanas de resistencia a la velocidad en 400 m para un grupo de velocistas, 4 días por semana. Aria redacta cuatro sesiones por semana, la entrenadora las revisa y agrega el bloque al calendario, y dos semanas de sesiones aparecen en el calendario del grupo de velocistas para sus 18 atletas.',
  stepsLabel: 'Cómo funciona el creador de programas con IA',
  steps: [
    { title: 'Pregúntale a Aria', text: 'Describe el bloque con tus palabras.' },
    { title: 'Revisa el borrador', text: 'Tú puedes cambiar cada sesión.' },
    { title: 'Envíalo al calendario', text: 'Todo el grupo lo ve en la app.' },
  ],
  stage: {
    calendarTitle: 'Grupo de velocistas · Calendario',
    range: ['1 semana', '2 semanas', '4 semanas'],
    days: ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'],
    weeks: ['SEMANA 1', 'SEMANA 2'],
    sessions: { acceleration: 'Aceleración', tempo: 'Tempo', speedEndurance: 'Resistencia a la velocidad', raceModel: 'Modelo de carrera' },
    askBadge: 'Pregúntale a Aria',
    askTitle: 'Armemos un programa',
    askText: 'Describe el bloque. Tú lo revisas.',
    prompt: ['Bloque de 8 semanas de 400 m para mi', 'grupo, 4 días por semana. Meta: 12 dic.'],
    generate: 'Generar',
    programAccent: '400 m',
    programTitle: 'Resistencia a la velocidad',
    programMeta: ['8 semanas', '4 sesiones por semana', 'Grupo de velocistas'],
    addToCalendar: 'Agregar al calendario',
    toast: 'Enviado al grupo de velocistas · 18 atletas',
  },
};

export const homeAi: { en: HomeAiCopy; es: HomeAiCopy } = { en, es };
