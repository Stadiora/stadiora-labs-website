export interface ClientLogo {
  slug: string;
  name: string;
  ext: 'svg' | 'png';
  /** Intrinsic pixel size of the artwork; only the ratio is used for layout. */
  width: number;
  height: number;
  /**
   * Rendered height in px. Each mark is sized for equal optical area (ink x bounding box), not equal height,
   * so a dense seal and a long thin wordmark read as the same weight. Measured by `scripts/logo-sizes.mjs`.
   */
  h: number;
}

// Nine marks, shown in this order on the home marquee and the About partners strip. Widths and heights are the real pixel
// sizes of the artwork files in public/logos/; `h` comes from `node scripts/logo-sizes.mjs`.
export const clientLogos: ClientLogo[] = [
  { slug: 'lincoln-school', name: 'Lincoln School', ext: 'png', width: 256, height: 256, h: 62 },
  { slug: 'carfyd', name: 'CARFYD', ext: 'png', width: 433, height: 153, h: 46 },
  { slug: 'auge', name: 'AUGE', ext: 'svg', width: 549, height: 256, h: 64 },
  { slug: 'una', name: 'UNA', ext: 'png', width: 322, height: 256, h: 64 },
  { slug: 'costa-rica-tech-week', name: 'Costa Rica Tech Week', ext: 'png', width: 551, height: 145, h: 40 },
  { slug: 'thinktank-vc', name: 'ThinkTank.vc', ext: 'svg', width: 683, height: 256, h: 52 },
  { slug: 'mexico-tech-week', name: 'Mexico Tech Week', ext: 'svg', width: 219, height: 256, h: 64 },
  { slug: 'technnis', name: 'TechNNIS', ext: 'png', width: 1427, height: 181, h: 23 },
  { slug: 'ucr', name: 'UCR', ext: 'svg', width: 943, height: 256, h: 39 },
];
