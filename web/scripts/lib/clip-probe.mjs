// In-page probe: is any visible text cut off by an ancestor that clips (overflow other than visible)?
// For every element in <main> that owns a text node, take the fractional getBoundingClientRect of the element
// and of its text (a Range over the text nodes), and compare it with the padding box of each clipping ancestor,
// read on that ancestor, on the axes it clips. The element's own box counts when it clips itself
// (nowrap + overflow hidden), but then only its text is compared. Run with reduced motion so no reveal
// transform shifts the boxes. Evaluate with `page.evaluate(clipProbe)`.
export const clipProbe = () => {
  const tolerance = 0.5;
  const px = (v) => Number.parseFloat(v) || 0;
  const clips = (cs) => ({ x: cs.overflowX !== 'visible', y: cs.overflowY !== 'visible' });
  const out = [];
  let checked = 0;

  for (const el of document.querySelectorAll('main *')) {
    if (el.closest('.sr-only, [hidden], [inert]') || el.matches('script, style, svg, svg *')) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (!own.length) continue;
    if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;

    const range = document.createRange();
    range.setStartBefore(own[0]);
    range.setEndAfter(own[own.length - 1]);
    const text = range.getBoundingClientRect();
    if (text.width === 0 && text.height === 0) continue;
    const box = el.getBoundingClientRect();
    if (box.width <= 1 && box.height <= 1) continue;
    checked += 1;

    for (let node = el; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
      const cs = getComputedStyle(node);
      const axis = clips(cs);
      if (!axis.x && !axis.y) continue;
      const r = node.getBoundingClientRect();
      const left = r.left + px(cs.borderLeftWidth);
      const right = r.right - px(cs.borderRightWidth);
      const top = r.top + px(cs.borderTopWidth);
      const bottom = r.bottom - px(cs.borderBottomWidth);
      const target = node === el ? text : { left: Math.min(box.left, text.left), right: Math.max(box.right, text.right), top: Math.min(box.top, text.top), bottom: Math.max(box.bottom, text.bottom) };
      const cut = [];
      if (axis.x && target.left < left - tolerance) cut.push(`left ${(left - target.left).toFixed(1)}px`);
      if (axis.x && target.right > right + tolerance) cut.push(`right ${(target.right - right).toFixed(1)}px`);
      if (axis.y && target.top < top - tolerance) cut.push(`top ${(top - target.top).toFixed(1)}px`);
      if (axis.y && target.bottom > bottom + tolerance) cut.push(`bottom ${(target.bottom - bottom).toFixed(1)}px`);
      if (cut.length) {
        const name = (n) => `${n.tagName.toLowerCase()}${n.className && typeof n.className === 'string' ? `.${n.className.trim().split(/\s+/)[0]}` : ''}`;
        out.push(`"${el.textContent.trim().replace(/\s+/g, ' ').slice(0, 28)}" (${name(el)}) cut ${cut.join(', ')} by ${name(node)}`);
      }
    }
  }
  return { checked, cutCount: out.length, cut: out.slice(0, 8) };
};
