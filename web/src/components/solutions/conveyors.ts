// Photo sets for the two hero conveyors (all of them already ship in public/home/img; none has words in it).
const IMG = '/home/img/';

export interface ConveyorTile {
  src: string;
  shape: 'sq' | 'p45';
  w: number;
  h: number;
}
const t = (name: string, shape: 'sq' | 'p45', w: number, h: number): ConveyorTile => ({ src: `${IMG}${name}.webp`, shape, w, h });

/** Schools: the centre lane steps through one block per swapped team word (track, soccer, strength); the side lanes are the school day. */
export const schoolsConveyor = {
  blocks: ['hero4-track-and-field', 'hero3-soccer-academies', 'hero5-gyms-and-studios'],
  laneA: [
    t('hero2-high-school-teams-tile-4x5-480', 'p45', 480, 600),
    t('S1-schools-800', 'sq', 800, 600),
    t('hero7-universities-tile-4x5-480', 'p45', 480, 600),
    t('night-huddle-800', 'sq', 800, 533),
    t('bd-coach-cyan-800', 'p45', 800, 1200),
    t('hero2-high-school-teams-tile-1x1-480', 'sq', 480, 480),
  ],
  laneB: [
    t('hero2-high-school-teams-big-560', 'p45', 560, 700),
    t('hero4-track-and-field-tile-1x1-480', 'sq', 480, 480),
    t('bd-sprinter-violet-800', 'p45', 800, 1200),
    t('hero3-soccer-academies-tile-1x1-480', 'sq', 480, 480),
    t('proof-masters-back-480', 'p45', 480, 720),
    t('hero5-gyms-and-studios-tile-1x1-480', 'sq', 480, 480),
  ],
};

/** Teams and clubs: three lanes of soccer-led photos (no swap on that page, so every lane just loops). */
export const clubsConveyor = {
  laneA: [
    t('hero3-soccer-academies-big-560', 'p45', 560, 700),
    t('cv-bowl-flash-480', 'sq', 480, 480),
    t('bd-soccer-mint-800', 'p45', 800, 1200),
    t('hero3-soccer-academies-tile-1x1-480', 'sq', 480, 480),
  ],
  laneB: [
    t('night-huddle-800', 'sq', 800, 533),
    t('hero3-soccer-academies-tile-4x5-480', 'p45', 480, 600),
    t('hero2-high-school-teams-tile-1x1-480', 'sq', 480, 480),
    t('hero1-coaches-big-560', 'p45', 560, 700),
  ],
  laneC: [
    t('bd-soccer-mint-800', 'p45', 800, 1200),
    t('hero3-soccer-academies-tile-1x1-480', 'sq', 480, 480),
    t('hero3-soccer-academies-big-560', 'p45', 560, 700),
    t('cv-bowl-flash-480', 'sq', 480, 480),
  ],
};
