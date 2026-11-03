// Region for pricing, decided on the device from the browser time zone. No network lookup.
// LatAm is an explicit allow-list of IANA zones in Mexico, Central America, South America and the
// Caribbean. Puerto Rico and the US Virgin Islands are US, and so is every zone not listed, including
// an unknown or missing one. Only type imports here: the evidence script loads this file directly.

import type { Region } from './pricing';

export const latamZones: ReadonlySet<string> = new Set([
  // Mexico
  'America/Mexico_City', 'America/Cancun', 'America/Merida', 'America/Monterrey', 'America/Matamoros',
  'America/Chihuahua', 'America/Ciudad_Juarez', 'America/Ojinaga', 'America/Mazatlan',
  'America/Bahia_Banderas', 'America/Hermosillo', 'America/Tijuana',
  // Central America
  'America/Belize', 'America/Costa_Rica', 'America/El_Salvador', 'America/Guatemala',
  'America/Tegucigalpa', 'America/Managua', 'America/Panama',
  // South America
  'America/Argentina/Buenos_Aires', 'America/Argentina/Catamarca', 'America/Argentina/Cordoba',
  'America/Argentina/Jujuy', 'America/Argentina/La_Rioja', 'America/Argentina/Mendoza',
  'America/Argentina/Rio_Gallegos', 'America/Argentina/Salta', 'America/Argentina/San_Juan',
  'America/Argentina/San_Luis', 'America/Argentina/Tucuman', 'America/Argentina/Ushuaia',
  'America/Buenos_Aires', 'America/Catamarca', 'America/Cordoba', 'America/Jujuy', 'America/Mendoza',
  'America/Rosario', 'America/Asuncion', 'America/La_Paz', 'America/Lima', 'America/Bogota',
  'America/Guayaquil', 'America/Caracas', 'America/Guyana', 'America/Paramaribo', 'America/Cayenne',
  'America/Montevideo', 'America/Santiago', 'America/Punta_Arenas', 'America/Coyhaique', 'America/Sao_Paulo',
  'America/Manaus', 'America/Belem', 'America/Fortaleza', 'America/Recife', 'America/Bahia',
  'America/Maceio', 'America/Araguaina', 'America/Campo_Grande', 'America/Cuiaba',
  'America/Porto_Velho', 'America/Boa_Vista', 'America/Rio_Branco', 'America/Porto_Acre',
  'America/Eirunepe', 'America/Santarem', 'America/Noronha',
  // Pacific islands of Chile and Ecuador
  'Pacific/Easter', 'Pacific/Galapagos',
  // Caribbean
  'America/Havana', 'America/Santo_Domingo', 'America/Port-au-Prince', 'America/Jamaica',
  'America/Nassau', 'America/Barbados', 'America/Port_of_Spain', 'America/Curacao', 'America/Aruba',
  'America/Kralendijk', 'America/Lower_Princes', 'America/Martinique', 'America/Guadeloupe',
  'America/Marigot', 'America/St_Barthelemy', 'America/Grand_Turk', 'America/Cayman',
  'America/Antigua', 'America/Dominica', 'America/Grenada', 'America/St_Kitts', 'America/St_Lucia',
  'America/St_Vincent', 'America/Anguilla', 'America/Montserrat', 'America/Tortola',
]);

export function regionFromTimeZone(timeZone: string | null | undefined): Region {
  return timeZone && latamZones.has(timeZone) ? 'latam' : 'us';
}

/** `?region=latam|us` wins (a test hook, not linked anywhere); otherwise the browser time zone decides. */
export function detectRegion(search: string, timeZone: string | null | undefined): Region {
  const forced = new URLSearchParams(search).get('region');
  if (forced === 'latam' || forced === 'us') return forced;
  return regionFromTimeZone(timeZone);
}
