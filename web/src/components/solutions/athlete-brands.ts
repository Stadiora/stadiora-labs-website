// The look each athlete app wears in the hero morph. Colours, marks and photos follow the home "your own app" block
// (home-showcase.ts); the words come from athletes.ts, so the morph can only say what the page already says.
// `f` is the ink for the words on the screen: white on the cyan and the mint is 2.17:1 and 1.92:1, so those wear navy.
export interface AthleteBrand {
  c: string;
  f: string;
  m: string;
  img: string;
}

export const athleteBrands: Record<string, AthleteBrand> = {
  run: { c: '#00BEF3', f: '#08132B', m: 'R', img: 'A1-athletes-sprinter-800' },
  aria12: { c: '#34D399', f: '#08132B', m: '12', img: 'hero3-soccer-academies-big-800' },
  lift: { c: '#8B5CF6', f: '#FFFFFF', m: 'L', img: 'hero5-gyms-and-studios-big-800' },
  fitmg: { c: '#FF4D5E', f: '#08132B', m: 'FM', img: 'bd-jumper-flare-800' },
};
