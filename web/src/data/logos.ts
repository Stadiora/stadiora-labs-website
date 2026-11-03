export interface ClientLogo {
  slug: string;
  name: string;
  ext: 'svg' | 'png';
  /** Intrinsic width at the 256px intrinsic height (LOGOS.md). */
  width: number;
  height: number;
  /**
   * Rendered height in px. Each mark is sized for equal optical area (ink x bounding box), not equal height,
   * so a dense seal and a long thin wordmark read as the same weight. Measured by `scripts/logo-sizes.mjs`.
   */
  h: number;
}

// Six marks only. CARFYD has no verified artwork and is deliberately absent (DECISIONS #3).
export const clientLogos: ClientLogo[] = [
  { slug: 'lincoln-school', name: 'Lincoln School', ext: 'png', width: 256, height: 256, h: 62 },
  { slug: 'auge', name: 'AUGE', ext: 'svg', width: 549, height: 256, h: 64 },
  { slug: 'una', name: 'UNA', ext: 'png', width: 322, height: 256, h: 64 },
  { slug: 'thinktank-vc', name: 'ThinkTank.vc', ext: 'svg', width: 683, height: 256, h: 52 },
  { slug: 'ucr', name: 'UCR', ext: 'svg', width: 943, height: 256, h: 39 },
  { slug: 'mexico-tech-week', name: 'Mexico Tech Week', ext: 'svg', width: 219, height: 256, h: 64 },
];
