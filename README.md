# Evidence for PR #42: animations keep running under the mouse

Recorded with Playwright (Chromium) at 1440x900 against the built site. A real mouse (red ring cursor overlay) is parked on
every `[data-ap]` host of the page for several seconds while the page is recorded. Movement is measured from rendered
values: running `getAnimations()` currentTime advance, `video.currentTime` advance, canvas/class/content change.

## Videos (1440, this PR's build)
| Page | Video |
|---|---|
| Home (hero, every showcase block, proof) | videos/after-home-1440.mp4 |
| Teams | videos/after-teams-1440.mp4 |
| Custom-branded apps | videos/after-branded-1440.mp4 |
| Programs | videos/after-programs-1440.mp4 |
| Coaches | videos/after-coaches-1440.mp4 |
| Pricing | videos/after-pricing-1440.mp4 |
| About | videos/after-about-1440.mp4 |
| API | videos/after-api-1440.mp4 |

## Measured movement under a parked mouse, per page (47 hosts)
Before = `main` (e38292d). After = this PR. 45 of 47 hosts were frozen (`data-ap="off"`, `data-ap-why="hover"`) before;
all 47 are `data-ap="on"` and moving after.

| Page | Host under the mouse | Before (main) | After (this PR) |
|---|---|---|---|
| Home | `#hero.hero.impact` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 42/42 animations advanced; 1/1 video playing; content/canvas changed |
| Home | `.VIDEO` | data-ap=**on** (-), moving | data-ap=**on**, moving: 1/1 video playing |
| Home | `.swap` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: content/canvas changed |
| Home | `.swap.gt` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: content/canvas changed |
| Home | `.mosaic.rv` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: content/canvas changed |
| Home | `.media-frame.pl-frame` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 16/16 animations advanced; 1/1 video playing; content/canvas changed |
| Home | `.VIDEO` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 1/1 video playing |
| Home | `.ms-grid` | data-ap=**off** (hover), moving | data-ap=**on**, moving: 3/3 animations advanced; content/canvas changed |
| Home | `.en-grid` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 12/12 animations advanced; 1/1 video playing; content/canvas changed |
| Home | `.VIDEO` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 1/1 video playing |
| Home | `.marquee.rail` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 1/1 animations advanced; content/canvas changed |
| Home | `.dphone` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: content/canvas changed |
| Home | `.proof-text` | data-ap=**off** (hover), quote stayed dim: 0 of 8 words lit in 3.5 s | data-ap=**on**, quote reveal ran under the parked mouse: 0 → 8 of 8 words lit in 1.25 s |
| Teams | `.media-frame.eg-th` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 11/11 animations advanced; 1/1 video playing; content/canvas changed |
| Teams | `.VIDEO` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 1/1 video playing |
| Teams | `.VIDEO` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 1/1 video playing |
| Custom-branded apps | `.dphone` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: content/canvas changed |
| Custom-branded apps | `.VIDEO` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 1/1 video playing |
| Programs | `.media-frame.cf-frame` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 3/3 animations advanced; 1/1 video playing |
| Programs | `.VIDEO` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 1/1 video playing |
| Programs | `.media-frame.ai-frame` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 27/27 animations advanced; 1/1 video playing; content/canvas changed |
| Programs | `.VIDEO` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 1/1 video playing |
| Programs | `#pg-acc.acc.acc--wide` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 1/1 video playing |
| Programs | `.VIDEO` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 1/1 video playing |
| Programs | `.pg-send.rv` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 3/3 animations advanced; content/canvas changed |
| Programs | `.VIDEO` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 1/1 video playing |
| Coaches | `#sx-hero.sx-hero.impact` | data-ap=**off** (hover), moving | data-ap=**on**, moving: 15/15 animations advanced; 1/1 video playing; content/canvas changed |
| Coaches | `.VIDEO` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 1/1 video playing |
| Coaches | `.day.sx-stage` | data-ap=**off** (hover), moving | data-ap=**on**, moving: 9/9 animations advanced; content/canvas changed |
| Coaches | `.VIDEO` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 1/1 video playing |
| Pricing | `.est.impact` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 1/1 animations advanced |
| Pricing | `.VIDEO` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 1/1 video playing |
| About | `#about-hero.sx-hero.impact` | data-ap=**off** (hover), moving | data-ap=**on**, moving: 10/10 animations advanced; content/canvas changed |
| About | `.marquee.logo-marquee` | data-ap=**off** (hover), moving | data-ap=**on**, moving: 1/1 animations advanced; content/canvas changed |
| About | `.VIDEO` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 1/1 video playing |
| API | `.eng-host` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 44/44 animations advanced; content/canvas changed |
| API | `.dw-sticky` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 66/66 animations advanced; content/canvas changed |
| API | `.cc` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 2/2 animations advanced; content/canvas changed |
| API | `.cc` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 1/1 animations advanced |
| API | `.cc` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 8/8 animations advanced; content/canvas changed |
| API | `.cc` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 2/2 animations advanced |
| API | `.cc` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 4/4 animations advanced |
| API | `.code.rv` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 1/1 animations advanced; content/canvas changed |
| API | `.hub.rv` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 8/8 animations advanced; content/canvas changed |
| API | `#sports.sp-strip.is-off` | data-ap=**on** (-), moving | data-ap=**on**, moving: content/canvas changed |
| API | `.uc-grid` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: content/canvas changed |
| API | `.VIDEO` | data-ap=**off** (hover), frozen | data-ap=**on**, moving: 1/1 video playing |

## Raw data (data/)
`before-measure-1440.json`, `after-measure-1440.json`, `after-measure-390.json`, `before-measure-390-programs.json`,
`flicker-1440.json`, `proof-probe-before.txt`, `proof-probe-after.txt` (words lit over time under the mouse on the home
proof quote: before it stays at 0 of 8; after it goes 0 -> 8 of 8 in about 1.25 s), `logo-montage.png`.

## 390 px
44 hosts probed, 37 moving. The rest: `proof-text` (a one-shot reveal) and `#pg-acc` on Programs, whose `data-ap` stays
`on` (on `main` it was `off`/hover). No layout changed at either width, so no 390 regression.

## Text under a parked mouse
The only moving content with a real hover effect under the pointer is `.logo-marquee img:hover` (opacity and a 1.06 scale).
`logo-montage.png` shows each logo scaling smoothly as it passes under a parked mouse, with no flicker. Other hover rules
inside animated hosts (`.pcard:hover`, `.mega-cta`, `.btn`, `.code-replay`, `.acc__btn`) caused no visible problem. No breakage found.
