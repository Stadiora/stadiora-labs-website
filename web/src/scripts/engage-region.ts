// Picks the school price shown on the Teams page: US by default, Latin America when the visitor's
// time zone says so. `?region=latam` or `?region=us` overrides it. The server-rendered text is the
// US price, so the page is correct without JavaScript.
const LATAM = new Set([
  'Mexico_City',
  'Cancun',
  'Merida',
  'Monterrey',
  'Matamoros',
  'Chihuahua',
  'Ciudad_Juarez',
  'Ojinaga',
  'Mazatlan',
  'Hermosillo',
  'Tijuana',
  'Bahia_Banderas',
  'Guatemala',
  'Belize',
  'El_Salvador',
  'Tegucigalpa',
  'Managua',
  'Costa_Rica',
  'Panama',
  'Havana',
  'Santo_Domingo',
  'Port-au-Prince',
  'Jamaica',
  'Bogota',
  'Lima',
  'Guayaquil',
  'Caracas',
  'La_Paz',
  'Santiago',
  'Punta_Arenas',
  'Asuncion',
  'Montevideo',
  'Buenos_Aires',
  'Cordoba',
  'Guyana',
  'Paramaribo',
  'Cayenne',
  'Sao_Paulo',
  'Bahia',
  'Fortaleza',
  'Recife',
  'Belem',
  'Manaus',
  'Cuiaba',
  'Campo_Grande',
  'Porto_Velho',
  'Boa_Vista',
  'Rio_Branco',
  'Maceio',
  'Araguaina',
  'Santarem',
  'Eirunepe',
  'Noronha',
]);

function detect(): 'us' | 'latam' {
  const forced = new URLSearchParams(window.location.search).get('region');
  if (forced === 'latam' || forced === 'us') return forced;
  let zone = '';
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    return 'us';
  }
  if (!zone.startsWith('America/')) return 'us';
  const rest = zone.slice('America/'.length);
  return rest.startsWith('Argentina/') || LATAM.has(rest) ? 'latam' : 'us';
}

const region = detect();
document.documentElement.dataset.region = region;
document.querySelectorAll<HTMLElement>('[data-region-price]').forEach((el) => {
  const price = region === 'latam' ? el.dataset.latam : el.dataset.us;
  if (price) el.textContent = price;
});

export {};
