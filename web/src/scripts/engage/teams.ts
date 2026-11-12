// Teams page: a skeleton planner loops behind the school workspace card (no text, just bars painting in), and
// the Core "from" price (the same athlete-based price for every team) follows the visitor's region. The HTML always holds the US rate; the swap uses the same table
// and region detection as /pricing.
import { $, $$, group, startKit, tl, type Frame } from '../motion/kit';
import { bands, prices, usd } from '../../data/prices';
import { detectRegion } from '../../lib/region';

const O = 'opacity';
const T = 'transform';
const f = (...a: Frame[]) => a;

const region = detectRegion(window.location.search);
// With pricing hidden the page carries no [data-core-from] elements, so there is nothing to swap.
const text: Record<string, string> = { price: usd(prices.coreFrom[region]), athletes: String(bands[region][0].athletes) };
$$<HTMLElement>('[data-core-from]').forEach((el) => {
  const value = text[el.dataset.coreFrom ?? ''];
  if (value) el.textContent = value;
});

startKit();

const host = $<HTMLElement>('.eg-th');
if (host) {
  const DUR = 9;
  group(
    host,
    DUR,
    () => [
      ...$$<HTMLElement>('.ev', host).map((el, i) => {
        const at = 0.4 + i * 0.5;
        return tl(el, DUR, f([0, { [O]: 0, [T]: 'scaleX(0)' }], [at, {}], [at + 0.6, { [O]: 1, [T]: 'scaleX(1)' }], [8.2, {}], [8.9, { [O]: 0 }], [DUR, {}]));
      }),
      tl($('.eg-plan__hd', host), DUR, f([0, { [O]: 0.4 }], [0.2, { [O]: 1 }], [8.4, {}], [8.9, { [O]: 0.4 }], [DUR, {}])),
    ],
    { within: host },
  );
}
