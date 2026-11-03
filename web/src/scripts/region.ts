// Swaps every [data-region-price] to the visitor's region, using the shared table and detector. The server renders
// the US price, so visitors without JavaScript see it, and LatAm prices reach the page only through this bundle.
import { prices, usd, type PriceKey } from '../data/prices';
import { detectRegion } from '../lib/region';

const region = detectRegion(window.location.search);
document.documentElement.dataset.region = region;
document.querySelectorAll<HTMLElement>('[data-region-price]').forEach((el) => {
  const key = el.dataset.regionPrice as PriceKey;
  if (key in prices) el.textContent = usd(prices[key][region]);
});

export {};
