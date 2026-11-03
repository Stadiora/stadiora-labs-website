// In-page probe: is any visible text cut off by an ancestor that clips (overflow other than visible)?
// For every element in <main> that owns a text node, take the fractional getBoundingClientRect of the element
// and of its text (a Range over the text nodes), and compare it with the padding box of each clipping ancestor,
// read on that ancestor, on the axes it clips. The element's own box counts when it clips itself
// (nowrap + overflow hidden), but then only its text is compared. Run with reduced motion so no reveal
// transform shifts the boxes. Evaluate with `page.evaluate(clipProbe)`.
// Vertically a glyph is judged by its painted ink (canvas actualBoundingBox), not by the font's content area: a tight
// display heading (line-height .88, capitals only) may be masked right at the cap height without cutting any ink.
// For text moving through a window by design (a conveyor lane), mark the window `data-clip-window="y"` (or "x", "xy"):
// content cut by that window, or by any clipping ancestor beyond it, on those axes is not a defect.
export const clipProbe = () => {
  const tolerance = 0.5;
  const px = (v) => Number.parseFloat(v) || 0;
  const clips = (cs) => ({ x: cs.overflowX !== 'visible', y: cs.overflowY !== 'visible' });
  const out = [];
  let checked = 0;
  const ctx = document.createElement('canvas').getContext('2d');
  const transformed = (text, mode) => (mode === 'uppercase' ? text.toUpperCase() : mode === 'lowercase' ? text.toLowerCase() : mode === 'capitalize' ? text.replace(/\b\p{L}/gu, (c) => c.toUpperCase()) : text);
  // The text box with its top and bottom pulled in from the font's content area to the ink of this text.
  const inkBox = (el, range, own) => {
    const cs = getComputedStyle(el);
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    // Width axes do not change vertical ink, so the canvas font ignores font-stretch and variation settings.
    const m = ctx.measureText(transformed(own.map((n) => n.textContent).join(''), cs.textTransform));
    const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    const rect = range.getBoundingClientRect();
    if (!rects.length || !m.fontBoundingBoxAscent) return rect;
    const trimTop = Math.max(0, m.fontBoundingBoxAscent - m.actualBoundingBoxAscent);
    const trimBottom = Math.max(0, m.fontBoundingBoxDescent - m.actualBoundingBoxDescent);
    return {
      left: rect.left,
      right: rect.right,
      top: Math.min(...rects.map((r) => r.top + trimTop)),
      bottom: Math.max(...rects.map((r) => r.bottom - trimBottom)),
    };
  };

  for (const el of document.querySelectorAll('main *')) {
    if (el.closest('.sr-only, [hidden], [inert]') || el.matches('script, style, svg, svg *')) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (!own.length) continue;
    if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;

    const range = document.createRange();
    range.setStartBefore(own[0]);
    range.setEndAfter(own[own.length - 1]);
    const outline = range.getBoundingClientRect();
    if (outline.width === 0 && outline.height === 0) continue;
    const text = inkBox(el, range, own);
    const box = el.getBoundingClientRect();
    if (box.width <= 1 && box.height <= 1) continue;
    checked += 1;

    const windowed = { x: false, y: false };
    for (let node = el; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
      const win = node.getAttribute('data-clip-window') ?? '';
      if (win.includes('x')) windowed.x = true;
      if (win.includes('y')) windowed.y = true;
      const cs = getComputedStyle(node);
      const axis = clips(cs);
      axis.x = axis.x && !windowed.x;
      axis.y = axis.y && !windowed.y;
      if (!axis.x && !axis.y) continue;
      const r = node.getBoundingClientRect();
      // A clipper with no extent on an axis is a collapsed disclosure (an accordion row at 0fr), not a cut.
      if (r.height < 1) axis.y = false;
      if (r.width < 1) axis.x = false;
      if (!axis.x && !axis.y) continue;
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
