// Swaps every [data-region-price] to the visitor's region. Without JavaScript the server-rendered US value stays.
import { detectRegion } from '../lib/region';

const region = detectRegion(window.location.search);
document.documentElement.dataset.region = region;
document.querySelectorAll<HTMLElement>('[data-region-price]').forEach((el) => {
  const value = region === 'latam' ? el.dataset.latam : el.dataset.us;
  if (value) el.textContent = value;
});

export {};
