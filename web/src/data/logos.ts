export interface ClientLogo {
  slug: string;
  name: string;
  ext: 'svg' | 'png';
  /** Intrinsic width at the 256px intrinsic height (LOGOS.md). */
  width: number;
  height: number;
}

// Six marks only. CARFYD has no verified artwork and is deliberately absent (DECISIONS #3).
export const clientLogos: ClientLogo[] = [
  { slug: 'lincoln-school', name: 'Lincoln School', ext: 'png', width: 256, height: 256 },
  { slug: 'auge', name: 'AUGE', ext: 'svg', width: 549, height: 256 },
  { slug: 'una', name: 'UNA', ext: 'png', width: 322, height: 256 },
  { slug: 'thinktank-vc', name: 'ThinkTank.vc', ext: 'svg', width: 683, height: 256 },
  { slug: 'ucr', name: 'UCR', ext: 'svg', width: 943, height: 256 },
  { slug: 'mexico-tech-week', name: 'Mexico Tech Week', ext: 'svg', width: 219, height: 256 },
];
