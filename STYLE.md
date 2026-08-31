# Stadiora Labs style guide

One reference for the stadioralabs.com rebuild. Copy rules, brand tokens and shared
components live here. Read this before editing any page.

Source of truth for product facts, traction and team bios is issue #2. Do not invent
facts, metrics, quotes or URLs. If something is missing, raise it in the PR description,
never as placeholder text on a page.

---

## 1. Copy rules

These are hard rules and they apply to English and Spanish equally.

1. **No em dashes anywhere.** The long dash character is banned in body copy, headlines,
   alt text and meta descriptions. Rewrite the sentence, split it in two, or use a comma.
2. **No colons in display copy.** Headlines, card titles, buttons, eyebrows and nav labels
   carry no colon. Body paragraphs may use one where it genuinely helps.
3. **Spanish uses the closing question mark only.** Write `Listo para empezar?`, never the
   inverted opening mark. Same for exclamations, closing mark only.
4. **Human tone.** No rule-of-three cadence, no buzzword nouns, no "Not X. Not Y. Z."
   patterns unless that phrasing is already part of a headline we are keeping.
5. **EN and ES parity.** Every English page has a Spanish twin with the same sections, the
   same claims and the same links. `page.html` pairs with `page-es.html`.
6. **Stroke SVG icons only. Never emojis.** Icons are inline SVG with `fill: none` and
   `stroke: currentColor`. The base stylesheet sets that default, so an icon inherits the
   colour of its container.
7. **Middot separators are a motif.** Use the middot character between short items in a
   meta line. `.sl-dotlist` renders them for you, do not type them by hand inside it.

### Naming

| Write this | Not this |
| --- | --- |
| Run with Aria, then "Aria" after first mention | Aria XI, Stadiora app |
| Aria 12 | Aria XI |
| Aria for Coaches | Stadiora (as a product name) |
| Stadiora Labs | Stadiora, when the company is meant |

Store links, used wherever an app is mentioned:

- App Store `https://apps.apple.com/us/app/run-with-aria/id6760048203`
- Google Play `https://play.google.com/store/apps/details?id=com.aria.mobile`

---

## 2. Loading the stylesheet

`styles/site.css` holds the whole system. Link it once per page.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap">
<link rel="stylesheet" href="./styles/site.css">
```

The stylesheet also carries an `@import` for the same Google Fonts URL, so it works
standalone. Keeping the `<link>` tags in `<head>` is still preferred because the fonts
start downloading earlier.

Bebas Neue and DM Sans are retired. Do not reintroduce them.

---

## 3. Tokens

Every token is a CSS custom property on `:root`, prefixed `--sl-`. Use tokens, not raw
hex values, so a palette change stays a one-line edit.

### Ink scale

| Token | Value | Use |
| --- | --- | --- |
| `--sl-ink-900` | `#010812` | Page background |
| `--sl-ink-800` | `#040c1c` | Alternating sections, footer |
| `--sl-ink-700` | `#060e20` | Cards and panels |
| `--sl-ink-600` | `#0a1428` | Raised panel inside a card |
| `--sl-ink-500` | `#101d38` | Chart fills, subtle blocks |

### Text

| Token | Value | Use |
| --- | --- | --- |
| `--sl-white` | `#ffffff` | Headlines, numbers |
| `--sl-text` | `rgba(255,255,255,.92)` | Default body text |
| `--sl-text-muted` | `rgba(255,255,255,.62)` | Supporting paragraphs |
| `--sl-text-faint` | `rgba(255,255,255,.38)` | Labels, captions |
| `--sl-text-ghost` | `rgba(255,255,255,.22)` | Watermarks, disabled |

### Accents

| Token | Value | Use |
| --- | --- | --- |
| `--sl-cyan` | `#00b8d4` | Primary accent, buttons, eyebrows |
| `--sl-cyan-bright` | `#00e5ff` | Hover, highlighted words, focus ring |
| `--sl-cyan-soft` | `rgba(0,184,212,.14)` | Tinted backgrounds |
| `--sl-cyan-line` | `rgba(0,184,212,.38)` | Accent borders |
| `--sl-violet` | `#8b5cf6` | Partner and secondary accents only |
| `--sl-violet-soft` | `rgba(139,92,246,.14)` | Partner card tint |
| `--sl-violet-line` | `rgba(139,92,246,.36)` | Partner card border |

Violet is restrained by design. One violet element per screen at most, reserved for
partner or secondary signals. Everything else is cyan.

### Surfaces and borders

`--sl-surface`, `--sl-surface-raised`, `--sl-border`, `--sl-border-strong`.

### Type

| Token | Value |
| --- | --- |
| `--sl-font-display` | Space Grotesk, then Segoe UI, system-ui, sans-serif |
| `--sl-font-body` | Space Grotesk, same fallbacks |
| `--sl-font-mono` | Space Mono, then ui-monospace, Consolas, monospace |

Space Grotesk carries display and body. Space Mono carries labels, eyebrows, stat numbers
and anything that should read as machine output.

Sizes are fluid: `--sl-text-display`, `--sl-text-h1`, `--sl-text-h2`, `--sl-text-h3`,
`--sl-text-lead`, `--sl-text-body`, `--sl-text-small`, `--sl-text-label`. Line height and
tracking come from `--sl-leading-tight`, `--sl-leading-snug`, `--sl-leading-body`,
`--sl-tracking-label`, `--sl-tracking-display`.

### Space, shape, motion, frame

Spacing runs `--sl-space-1` (4px) through `--sl-space-9` (96px), plus `--sl-section-y`
for vertical section rhythm. Shape uses `--sl-radius-sm`, `--sl-radius`, `--sl-radius-lg`,
`--sl-radius-pill`. Depth uses `--sl-shadow-card` and `--sl-shadow-glow`. Motion uses
`--sl-ease` and `--sl-speed`. The frame uses `--sl-container` (1200px), `--sl-gutter` and
`--sl-nav-h`.

---

## 4. Shared components

Class names are namespaced `sl-` so a page can be migrated block by block without
colliding with its own legacy styles. Blocks use `sl-block`, elements use
`sl-block__element`, variants use `sl-block--variant`.

| Component | Classes |
| --- | --- |
| Page frame | `.sl-container`, `.sl-section`, `.sl-section--alt`, `.sl-grid` with `--2` `--3` `--4` |
| Nav bar | `.sl-nav`, `.sl-nav__inner`, `.sl-nav__logo`, `.sl-nav__links`, `.sl-nav__actions`, `.sl-nav__toggle`, `.sl-nav-offset` on the first section |
| Language toggle | `.sl-lang`, `.sl-lang__btn`, active state `.is-active` or `aria-current="true"` |
| Eyebrow | `.sl-eyebrow` |
| Headings | `.sl-display`, `.sl-h1`, `.sl-h2`, `.sl-h3`, `.sl-lead` |
| Labels and numbers | `.sl-label`, `.sl-stat-num`, `.sl-stat-label`, `.sl-dotlist` |
| Buttons | `.sl-btn` plus `--primary`, `--ghost`, `--violet`, `--block`, grouped in `.sl-btn-row` |
| Card | `.sl-card` plus `--link`, `--flush`, `--violet`, with `.sl-card__icon`, `.sl-card__title`, `.sl-card__body` |
| Store badges | `.sl-stores`, `.sl-store`, `.sl-store__kicker`, `.sl-store__name` |
| Footer | `.sl-footer`, `.sl-footer__grid`, `.sl-footer__brand`, `.sl-footer__title`, `.sl-footer__links`, `.sl-footer__social`, `.sl-footer__bottom`, `.sl-footer__legal` |
| Utilities | `.sl-center`, `.sl-stack`, `.sl-flow`, `.sl-rule`, `.sl-hide`, `.sl-sr-only` |

### Patterns

Store badge row.

```html
<div class="sl-stores">
  <a class="sl-store" href="https://apps.apple.com/us/app/run-with-aria/id6760048203" target="_blank" rel="noopener">
    <svg viewBox="0 0 24 24" aria-hidden="true"><!-- stroke icon --></svg>
    <span class="sl-store__text">
      <span class="sl-store__kicker">Download on the</span>
      <span class="sl-store__name">App Store</span>
    </span>
  </a>
</div>
```

Language toggle.

```html
<div class="sl-lang">
  <span class="sl-lang__btn is-active" aria-current="true">EN</span>
  <a class="sl-lang__btn" href="./index-es.html" hreflang="es">ES</a>
</div>
```

---

## 5. Assets

`assets/deck-v2/` carries the current deck and app assets. Use these, not the older files
in `stadioralabs info/`, wherever both exist.

| File | What it is |
| --- | --- |
| `shot_home.png` | Aria app home screen |
| `shot_rehab.png` | Aria app rehab screen |
| `shot_intelligence.png` | Aria app intelligence screen |
| `ian_c.png` | Ian Rowe headshot |
| `anthony_c.png` | Anthony Rugama headshot |
| `karla_c.png` | Karla Scott headshot |
| `joel_c.png` | Joel Campbell headshot |
| `qr_ios.png` | QR code to the App Store listing |
| `qr_android.png` | QR code to the Google Play listing |
| `brand_icon.png` | Brand icon |

Every image needs alt text. Decorative images get `alt=""` and `aria-hidden="true"`.

---

## 6. Quality bar for a page

Before a page slice ships:

- No horizontal scroll at 390px wide.
- Every link resolves, internal and external. External links carry
  `target="_blank" rel="noopener"`.
- The Spanish twin has full content parity with the English page.
- No em dash anywhere, no colon in display copy, no inverted question mark in Spanish.
- No emoji. Icons are stroke SVG.
- Headings run in order, `h1` once per page.
- Screenshots at desktop and 390px, both languages, attached to the PR.
