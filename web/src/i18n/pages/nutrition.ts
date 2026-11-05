// Copy for /platform/nutrition/ (DESIGN-2 section 1). Fictional data only.
import type { Locale } from '../index';
import type { PageMeta } from './coach-common';

const en = {
  meta: {
    title: 'Nutrition: meal plans, food diary and macros | Stadiora Labs',
    description: 'Meal plans from you, a simple food diary for them, and macros you can both see.',
  } satisfies PageMeta,
  hero: {
    eyebrow: 'Nutrition',
    title: 'Food that fits the training.',
    emphasis: 'fits the training',
    sub: 'Meal plans from you, a simple food diary for them, and macros you can both see.',
    secondary: 'See how it works',
    photoAlt:
      'A teenage athlete in a grey tee photographs her lunch plate of rice, beans, chicken, avocado and mango at a home kitchen counter.',
    meal: {
      label: 'Lunch',
      badge: 'Estimate',
      kcal: '640',
      unit: 'kcal',
      macros: [
        { name: 'Protein', value: '42 g', pct: 52 },
        { name: 'Carbs', value: '78 g', pct: 70 },
        { name: 'Fat', value: '16 g', pct: 28 },
      ],
    },
  },
  flow: {
    id: 'how',
    title: 'From plan to plate, and back to you.',
    steps: [
      { title: 'Plan', line: 'Write a plan or let Aria draft one. You approve it.' },
      { title: 'Plate', line: 'Athletes log food in seconds: search, scan or snap.' },
      { title: 'Week', line: 'See the week at a glance, not every meal.' },
    ],
    plan: {
      title: 'Meal plan · Sprint group',
      meta: '2,600 kcal · Protein 140 g',
      meals: [
        { name: 'Breakfast', food: 'Oats, berries, Greek yogurt', kcal: '780 kcal' },
        { name: 'Lunch', food: 'Chicken, rice, black beans', kcal: '900 kcal' },
        { name: 'Dinner', food: 'Salmon, quinoa, vegetables', kcal: '920 kcal' },
      ],
      ask: 'Ask Aria to draft a plan',
    },
    diary: {
      title: 'Today',
      meals: [
        { name: 'Breakfast', food: 'Oatmeal, banana, almonds', kcal: '520 kcal' },
        { name: 'Lunch', food: 'Chicken, rice, beans, avocado', kcal: '640 kcal' },
        { name: 'Snack', food: 'Greek yogurt, berries', kcal: '210 kcal' },
      ],
      scan: 'Scan barcode',
      snap: 'Snap a meal',
    },
    week: {
      title: 'Valeria · this week',
      meta: 'Protein on target 5 of 7 days',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      values: [172, 142, 156, 98, 158, 164, 104],
      chartLabel: 'Protein per day against a 140 g target: Mon 172, Tue 142, Wed 156, Thu 98, Fri 158, Sat 164, Sun 104 grams.',
    },
  },
  inside: {
    title: 'Everything for everyday eating',
    items: [
      { icon: 'clipboard-check', name: 'Meal plans', line: 'Write one, or let Aria draft it.' },
      { icon: 'bars', name: 'Macros and calories', line: 'Targets and totals for every day.' },
      { icon: 'list', name: 'Food diary', line: 'Search and log in seconds.' },
      { icon: 'barcode', name: 'Barcode scan', line: 'Scan packaged food.' },
      { icon: 'camera', name: 'Meal photo estimates', line: 'Snap a plate for an estimate.' },
      { icon: 'sparkle', name: 'AI plan drafts', line: 'You review and approve.' },
    ],
    note: 'Meal photos give an estimate. Athletes confirm it before it counts.',
  },
  also: ['readiness', 'programs', 'messaging'] as const,
};

export type NutritionCopy = typeof en;

const es: NutritionCopy = {
  meta: {
    title: 'Nutrición: planes de comidas, diario y macros | Stadiora Labs',
    description: 'Planes de comidas de tu parte, un diario de comidas sencillo para ellos y macros que ambos pueden ver.',
  },
  hero: {
    eyebrow: 'Nutrición',
    title: 'Comida que va con el entrenamiento.',
    emphasis: 'va con el entrenamiento',
    sub: 'Planes de comidas de tu parte, un diario de comidas sencillo para ellos y macros que ambos pueden ver.',
    secondary: 'Mira cómo funciona',
    photoAlt:
      'Una atleta adolescente con camiseta gris fotografía su plato de arroz, frijoles, pollo, aguacate y mango en la cocina de su casa.',
    meal: {
      label: 'Almuerzo',
      badge: 'Estimado',
      kcal: '640',
      unit: 'kcal',
      macros: [
        { name: 'Proteína', value: '42 g', pct: 52 },
        { name: 'Carbohidratos', value: '78 g', pct: 70 },
        { name: 'Grasa', value: '16 g', pct: 28 },
      ],
    },
  },
  flow: {
    id: 'how',
    title: 'Del plan al plato, y de vuelta a ti.',
    steps: [
      { title: 'Plan', line: 'Escribe un plan o deja que Aria haga un borrador. Tú lo apruebas.' },
      { title: 'Plato', line: 'Los atletas registran la comida en segundos: buscan, escanean o fotografían.' },
      { title: 'Semana', line: 'Mira la semana de un vistazo, no cada comida.' },
    ],
    plan: {
      title: 'Plan de comidas · Grupo de velocidad',
      meta: '2.600 kcal · Proteína 140 g',
      meals: [
        { name: 'Desayuno', food: 'Avena, frutos rojos, yogur griego', kcal: '780 kcal' },
        { name: 'Almuerzo', food: 'Pollo, arroz, frijoles negros', kcal: '900 kcal' },
        { name: 'Cena', food: 'Salmón, quinoa, verduras', kcal: '920 kcal' },
      ],
      ask: 'Pídele a Aria un borrador del plan',
    },
    diary: {
      title: 'Hoy',
      meals: [
        { name: 'Desayuno', food: 'Avena, banano, almendras', kcal: '520 kcal' },
        { name: 'Almuerzo', food: 'Pollo, arroz, frijoles, aguacate', kcal: '640 kcal' },
        { name: 'Merienda', food: 'Yogur griego, frutos rojos', kcal: '210 kcal' },
      ],
      scan: 'Escanear código',
      snap: 'Foto de comida',
    },
    week: {
      title: 'Valeria · esta semana',
      meta: 'Proteína en la meta 5 de 7 días',
      days: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      values: [172, 142, 156, 98, 158, 164, 104],
      chartLabel: 'Proteína por día frente a una meta de 140 g: lun 172, mar 142, mié 156, jue 98, vie 158, sáb 164, dom 104 gramos.',
    },
  },
  inside: {
    title: 'Todo para la comida de cada día',
    items: [
      { icon: 'clipboard-check', name: 'Planes de comidas', line: 'Escribe uno o deja que Aria haga el borrador.' },
      { icon: 'bars', name: 'Macros y calorías', line: 'Metas y totales de cada día.' },
      { icon: 'list', name: 'Diario de comidas', line: 'Busca y registra en segundos.' },
      { icon: 'barcode', name: 'Escaneo de código de barras', line: 'Escanea alimentos empacados.' },
      { icon: 'camera', name: 'Estimados con foto', line: 'Fotografía un plato y recibe un estimado.' },
      { icon: 'sparkle', name: 'Borradores de plan con IA', line: 'Tú los revisas y los apruebas.' },
    ],
    note: 'Las fotos de comidas dan un estimado. Los atletas lo confirman antes de que cuente.',
  },
  also: ['readiness', 'programs', 'messaging'] as const,
};

export const nutritionCopy: Record<Locale, NutritionCopy> = { en, es };
