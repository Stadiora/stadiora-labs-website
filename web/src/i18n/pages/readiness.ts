// Copy for /platform/readiness/ (DESIGN-2 sections 2 and 15). Fictional demo data only.
// No journal text is ever shown to the coach, so the roster has no free-text column.
import type { Locale } from '../index';
import type { PageMeta } from './coach-common';

const en = {
  meta: {
    title: 'Readiness and wellbeing: sleep, steps and check-ins | Stadiora Labs',
    description: 'Sleep, steps, check-ins and mindfulness in one daily picture, so you know how athletes feel before practice starts.',
  } satisfies PageMeta,
  hero: {
    eyebrow: 'Readiness and wellbeing',
    title: 'Know how they feel before practice starts.',
    emphasis: 'before practice',
    sub: 'Sleep, steps, check-ins and mindfulness in one daily picture.',
    secondary: 'See how it works',
    photoAlt: 'A woman athlete lacing her shoes on the edge of a bed at dawn, phone beside her.',
    card: { label: 'Readiness', value: '82', status: 'Ready to train' },
  },
  tracks: {
    id: 'tracks',
    eyebrow: 'What Aria tracks',
    title: 'One daily picture of every athlete.',
    rows: [
      { key: 'sleep', icon: 'moon', title: 'Sleep', body: 'Sleep comes in from the phone or watch app, night by night.' },
      { key: 'steps', icon: 'shoe', title: 'Steps', body: 'Daily steps sync on their own. No typing.' },
      { key: 'checkin', icon: 'clipboard-check', title: 'Daily check-in', body: 'Three taps each morning: sleep, soreness, mood.' },
      {
        key: 'readiness',
        icon: 'bars',
        title: 'Readiness',
        body: 'Sleep, soreness and mood become one score, so you know who’s ready to train.',
      },
      { key: 'goals', icon: 'target', title: 'Goals', body: 'Set a goal together and watch it move.' },
      { key: 'mind', icon: 'lotus', title: 'Mind', body: 'Breathing, journaling and mood check-ins for a calmer head.' },
    ],
    defaultOpen: 3,
  },
  phones: {
    date: 'Mon, Apr 28',
    sleep: {
      title: 'Sleep',
      value: '7 h 40 m',
      sub: 'Last night',
      source: 'From your phone or watch',
      days: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'],
      hours: [6.8, 7.4, 6.2, 8.0, 7.1, 7.9, 7.67],
    },
    steps: {
      title: 'Steps',
      value: '8,412',
      sub: 'Steps today',
      source: 'Synced from your phone',
      days: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'],
      counts: [9120, 7480, 10230, 6890, 8050, 11020, 8412],
    },
    checkin: {
      title: 'Daily check-in',
      step: '3 quick questions',
      questions: [
        { q: 'How did you sleep?', options: ['Poorly', 'Okay', 'Well'], picked: 2 },
        { q: 'How do your legs feel?', options: ['Fresh', 'A bit sore', 'Very sore'], picked: 1 },
        { q: 'How is your mood?', options: ['Low', 'Okay', 'Good'], picked: 2 },
      ],
      done: 'Done',
    },
    readiness: {
      title: 'Readiness',
      value: '82',
      status: 'Ready to train',
      rows: [
        { label: 'Sleep', value: '7 h 40 m', icon: 'moon' },
        { label: 'Mood', value: 'good', icon: 'smile' },
        { label: 'Legs', value: 'a bit sore', icon: 'shoe' },
      ],
    },
    goals: {
      title: 'Goals',
      goal: 'Run 400 m under 58 s',
      pct: 72,
      best: 'Best so far',
      bestValue: '59.6 s',
      target: 'Target',
      targetValue: '58.0 s',
      setBy: 'Set with Coach Daniela (Demo)',
    },
    mind: {
      title: 'Mind',
      lead: 'Take a minute for yourself.',
      tiles: [
        { name: 'Breathing', line: '3 minutes' },
        { name: 'Journal', line: 'How did practice feel?' },
        { name: 'Mood check-in', line: 'How are you feeling?' },
      ],
    },
  },
  calm: {
    title: 'A calmer mind, built in',
    rowLabel: 'Mindfulness features',
    cards: [
      {
        slot: 'f3a-readiness-breathing',
        label: 'Breathing',
        alt: 'A teenage boy sits cross-legged on a track infield with his eyes closed, taking a slow breath at sunset.',
        preview: 'Preview: a breathing exercise with the cue "Breathe in" and a 3 minute timer.',
        screen: { title: 'Breathing', cue: 'Breathe in', timer: '3:00' },
      },
      {
        slot: 'f3b-readiness-journal',
        label: 'Journal',
        alt: 'A teenage girl writes in a notebook on a locker-room bench with her sports bag beside her.',
        preview: 'Preview: a journal screen with the prompt "How did practice feel today?"',
        screen: { title: 'Journal', prompt: 'How did practice feel today?', placeholder: 'Write here…' },
      },
      {
        slot: 'f3c-readiness-mood-checkin',
        label: 'Mood check-in',
        alt: 'A young woman with earphones looks at her phone from a bus seat on team travel.',
        preview: 'Preview: a mood check-in screen with five faces to pick from.',
        screen: { title: 'Mood check-in', prompt: 'How are you feeling?', faces: ['Very low', 'Low', 'Okay', 'Good', 'Great'], picked: 3 },
      },
    ],
  },
  coach: {
    title: 'See the whole team before warm-up.',
    line: 'A team readiness list shows who’s good to go and who needs a word.',
    table: {
      title: 'Sprint group (Demo) · Today',
      browserUrl: 'app.ariaforcoaches.com',
      columns: ['Athlete', 'Readiness', 'Status'],
      rows: [
        { name: 'Valeria (Demo)', score: 82, status: 'Good to go', ok: true },
        { name: 'Marcos (Demo)', score: 76, status: 'Good to go', ok: true },
        { name: 'Sofía (Demo)', score: 58, status: 'Needs a word', ok: false },
        { name: 'Diego (Demo)', score: 88, status: 'Good to go', ok: true },
        { name: 'Camila (Demo)', score: 64, status: 'Needs a word', ok: false },
      ],
    },
  },
  footnote: 'Readiness is a training guide, not a medical check. Athletes choose what each coach sees.',
  also: ['nutrition', 'powerlab', 'integrations'] as const,
};

export type ReadinessCopy = typeof en;

const es: ReadinessCopy = {
  meta: {
    title: 'Preparación y bienestar: sueño, pasos y check-ins | Stadiora Labs',
    description:
      'Sueño, pasos, check-ins y atención plena en una sola imagen diaria, para que sepas cómo se sienten tus atletas antes de entrenar.',
  },
  hero: {
    eyebrow: 'Preparación y bienestar',
    title: 'Entérate de cómo se sienten antes de que empiece el entrenamiento.',
    emphasis: 'antes de que empiece el entrenamiento',
    sub: 'Sueño, pasos, check-ins y atención plena en una sola imagen diaria.',
    secondary: 'Mira cómo funciona',
    photoAlt: 'Una atleta se ata los zapatos al borde de la cama al amanecer, con el teléfono a su lado.',
    card: { label: 'Preparación', value: '82', status: 'Listo para entrenar' },
  },
  tracks: {
    id: 'tracks',
    eyebrow: 'Lo que sigue Aria',
    title: 'Una imagen diaria de cada atleta.',
    rows: [
      { key: 'sleep', icon: 'moon', title: 'Sueño', body: 'El sueño llega desde la app del teléfono o del reloj, noche a noche.' },
      { key: 'steps', icon: 'shoe', title: 'Pasos', body: 'Los pasos diarios se sincronizan solos. Sin escribir nada.' },
      { key: 'checkin', icon: 'clipboard-check', title: 'Check-in diario', body: 'Tres toques cada mañana: sueño, dolor muscular, ánimo.' },
      {
        key: 'readiness',
        icon: 'bars',
        title: 'Preparación',
        body: 'El sueño, el dolor muscular y el ánimo se vuelven un solo puntaje, para saber quién está listo para entrenar.',
      },
      { key: 'goals', icon: 'target', title: 'Metas', body: 'Fija una meta junto con tu atleta y mira cómo avanza.' },
      { key: 'mind', icon: 'lotus', title: 'Mente', body: 'Respiración, diario y check-ins de ánimo para una cabeza más tranquila.' },
    ],
    defaultOpen: 3,
  },
  phones: {
    date: 'Lun, 28 abr',
    sleep: {
      title: 'Sueño',
      value: '7 h 40 min',
      sub: 'Anoche',
      source: 'Desde tu teléfono o reloj',
      days: ['Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom', 'Lun'],
      hours: [6.8, 7.4, 6.2, 8.0, 7.1, 7.9, 7.67],
    },
    steps: {
      title: 'Pasos',
      value: '8.412',
      sub: 'Pasos de hoy',
      source: 'Sincronizado desde tu teléfono',
      days: ['Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom', 'Lun'],
      counts: [9120, 7480, 10230, 6890, 8050, 11020, 8412],
    },
    checkin: {
      title: 'Check-in diario',
      step: '3 preguntas rápidas',
      questions: [
        { q: 'Cómo dormiste?', options: ['Mal', 'Normal', 'Bien'], picked: 2 },
        { q: 'Cómo sientes las piernas?', options: ['Frescas', 'Algo adoloridas', 'Muy adoloridas'], picked: 1 },
        { q: 'Cómo está tu ánimo?', options: ['Bajo', 'Normal', 'Bueno'], picked: 2 },
      ],
      done: 'Listo',
    },
    readiness: {
      title: 'Preparación',
      value: '82',
      status: 'Listo para entrenar',
      rows: [
        { label: 'Sueño', value: '7 h 40 min', icon: 'moon' },
        { label: 'Ánimo', value: 'bueno', icon: 'smile' },
        { label: 'Piernas', value: 'algo adoloridas', icon: 'shoe' },
      ],
    },
    goals: {
      title: 'Metas',
      goal: 'Correr 400 m en menos de 58 s',
      pct: 72,
      best: 'Mejor marca',
      bestValue: '59,6 s',
      target: 'Meta',
      targetValue: '58,0 s',
      setBy: 'Fijada con la coach Daniela (Demo)',
    },
    mind: {
      title: 'Mente',
      lead: 'Tómate un minuto para ti.',
      tiles: [
        { name: 'Respiración', line: '3 minutos' },
        { name: 'Diario', line: 'Cómo se sintió el entrenamiento?' },
        { name: 'Check-in de ánimo', line: 'Cómo te sientes?' },
      ],
    },
  },
  calm: {
    title: 'Una mente más tranquila, incluida',
    rowLabel: 'Funciones de atención plena',
    cards: [
      {
        slot: 'f3a-readiness-breathing',
        label: 'Respiración',
        alt: 'Un adolescente sentado con las piernas cruzadas en el césped de la pista, con los ojos cerrados, respira despacio al atardecer.',
        preview: 'Vista previa: un ejercicio de respiración con la indicación "Inhala" y un temporizador de 3 minutos.',
        screen: { title: 'Respiración', cue: 'Inhala', timer: '3:00' },
      },
      {
        slot: 'f3b-readiness-journal',
        label: 'Diario',
        alt: 'Una adolescente escribe en un cuaderno en una banca del vestidor, con su bolso deportivo al lado.',
        preview: 'Vista previa: una pantalla de diario con la pregunta "Cómo se sintió el entrenamiento de hoy?"',
        screen: { title: 'Diario', prompt: 'Cómo se sintió el entrenamiento de hoy?', placeholder: 'Escribe aquí…' },
      },
      {
        slot: 'f3c-readiness-mood-checkin',
        label: 'Check-in de ánimo',
        alt: 'Una joven con audífonos mira su teléfono desde un asiento del autobús durante un viaje del equipo.',
        preview: 'Vista previa: una pantalla de check-in de ánimo con cinco caritas para elegir.',
        screen: { title: 'Check-in de ánimo', prompt: 'Cómo te sientes?', faces: ['Muy bajo', 'Bajo', 'Normal', 'Bien', 'Muy bien'], picked: 3 },
      },
    ],
  },
  coach: {
    title: 'Mira a todo el equipo antes de calentar.',
    line: 'Una lista de preparación del equipo muestra quién está listo y con quién conviene hablar.',
    table: {
      title: 'Grupo de velocidad (Demo) · Hoy',
      browserUrl: 'app.ariaforcoaches.com',
      columns: ['Atleta', 'Preparación', 'Estado'],
      rows: [
        { name: 'Valeria (Demo)', score: 82, status: 'Todo bien', ok: true },
        { name: 'Marcos (Demo)', score: 76, status: 'Todo bien', ok: true },
        { name: 'Sofía (Demo)', score: 58, status: 'Conviene hablar', ok: false },
        { name: 'Diego (Demo)', score: 88, status: 'Todo bien', ok: true },
        { name: 'Camila (Demo)', score: 64, status: 'Conviene hablar', ok: false },
      ],
    },
  },
  footnote: 'La preparación es una guía de entrenamiento, no un chequeo médico. Cada atleta elige qué ve cada entrenador.',
  also: ['nutrition', 'powerlab', 'integrations'] as const,
};

export const readinessCopy: Record<Locale, ReadinessCopy> = { en, es };
