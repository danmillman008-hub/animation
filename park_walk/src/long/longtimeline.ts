import gsap from 'gsap';
import {CustomEase, CustomWiggle} from 'gsap/all';
import {createState, type SceneState} from '../motion/state';
import {
  CYCLE_H, STRIDE_H, humanGait, dogGait, type Key,
} from '../motion/timeline';
import {ACT, createLongX, type LongX} from './longstate';

gsap.registerPlugin(CustomEase, CustomWiggle);
CustomWiggle.headless = true;
(CustomEase as unknown as {headless: boolean}).headless = true;
gsap.ticker.sleep();

CustomEase.create('stroll', 'M0,0 C0.3,0 0.4,1 1,1');
CustomEase.create('settle', 'M0,0 C0.2,0 0.35,1.12 0.62,1.04 C0.8,0.98 0.9,1 1,1');
CustomWiggle.create('shiver', {wiggles: 10, type: 'uniform'});
CustomWiggle.create('shake', {wiggles: 6, type: 'easeOut'});

export const LFPS = 24;
export const LDUR = 600;

type R = Record<string, number>;
const u = (o: unknown): R => o as R;

function cycleProp(tl: gsap.core.Timeline, target: R, prop: string, keys: Key[], dur: number, ease = 'sine.inOut') {
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i];
    const [t1, v1] = keys[i + 1];
    tl.fromTo(target, {[prop]: v0}, {[prop]: v1, duration: ((t1 - t0) / 1) * dur, ease, immediateRender: false}, t0 * dur);
  }
}

function absProp(tl: gsap.core.Timeline, target: R, prop: string, keys: Key[], ease = 'power1.inOut') {
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i];
    const [t1, v1] = keys[i + 1];
    tl.fromTo(target, {[prop]: v0}, {[prop]: v1, duration: t1 - t0, ease, immediateRender: false}, t0);
  }
}

export function getLongScene(): {tl: gsap.core.Timeline; state: SceneState; x: LongX} {
  const state = createState();
  const x = createLongX();
  const {human: h, dog: d, world: w, fx, leash} = state;
  const tl = gsap.timeline({paused: true, defaults: {overwrite: false}});

  /* ============ walking engine: cyclic gait segments + distance ============ */
  const distanceKeys: Key[] = [[0, 0]];
  let travelled = 0;
  const walkSeg = (t0: number, t1: number, gain = 1, stride = STRIDE_H, cyc = CYCLE_H): void => {
    let t = t0;
    while (t < t1 - 0.001) {
      const dur = Math.min(cyc, t1 - t);
      tl.add(humanGait(h, dur, gain), t);
      tl.add(dogGait(d, dur / 2, gain), t);
      tl.add(dogGait(d, dur / 2, gain), t + dur / 2);
      travelled += stride * gain * (dur / cyc);
      distanceKeys.push([t + dur, travelled]);
      t += dur;
    }
  };
  const settle = (at: number): void => {
    for (const leg of [d.legFL, d.legFR, d.legBL, d.legBR]) {
      for (const jt of [leg.hip, leg.knee, leg.paw]) tl.to(u(jt), {r: 0, duration: 0.45, ease: 'power2.inOut'}, at);
    }
    for (const jt of [h.thighF, h.shinF, h.footF, h.thighB, h.shinB, h.footB]) {
      tl.to(u(jt), {r: 0, duration: 0.45, ease: 'power2.inOut'}, at);
    }
    tl.to(u(h.uarmF), {r: -18, duration: 0.45, ease: 'power2.inOut'}, at);
    tl.to(u(h.larmF), {r: -10, duration: 0.45, ease: 'power2.inOut'}, at);
    tl.to(u(h.uarmB), {r: 8, duration: 0.45, ease: 'power2.inOut'}, at);
    tl.to(u(h.larmB), {r: 6, duration: 0.45, ease: 'power2.inOut'}, at);
  };

  tl.set(u(h), {x: -320}, 0);
  tl.set(u(d), {x: -260}, 0);

  /* ============ act 0 — prologue: the park asleep (0–45) ============ */
  absProp(tl, u(x), 'tod', [[0, 0], [40, 0.13]]);
  absProp(tl, u(x), 'mist', [[0, 0.85], [30, 0]]);
  absProp(tl, u(x.card), '0', [[6, 0], [8, 1], [13, 1], [16, 0]], 'power2.inOut');
  absProp(tl, u(x.snail), 'o', [[8, 0], [10, 1]]);
  absProp(tl, u(x.snail), 'x', [[8, 430], [44, 610]], 'none');
  absProp(tl, u(x.snail), 'o', [[8, 0], [10, 1], [58, 1], [63, 0]]);
  // two birds wake up and cross
  tl.fromTo(fx.birds[0], {x: 260, y: 300, o: 0, s: 0.9}, {o: 0.9, duration: 1.2}, 18);
  tl.to(fx.birds[0], {x: 1780, y: 190, duration: 22, ease: 'none'}, 18);
  tl.fromTo(fx.birds[0], {wing: 0}, {wing: 60, duration: 3, ease: 'none', repeat: 8}, 18);
  tl.fromTo(fx.birds[1], {x: -100, y: 240, o: 0, s: 0.7}, {o: 0.8, duration: 1.2}, 24);
  tl.to(fx.birds[1], {x: 1500, y: 150, duration: 18, ease: 'none'}, 24);
  tl.fromTo(fx.birds[1], {wing: 0}, {wing: 50, duration: 3, ease: 'none', repeat: 7}, 24);
  tl.to(fx.birds[0], {o: 0, duration: 1.5}, 39);
  tl.to(fx.birds[1], {o: 0, duration: 1.5}, 41);
  absProp(tl, u(w), 'camX', [[0, -160], [45, -40]], 'power1.inOut');
  absProp(tl, u(w), 'camScale', [[0, 1.06], [45, 1.06]]);

  /* ============ act 1 — arrival (45–135) ============ */
  absProp(tl, u(x.card), '1', [[49, 0], [51, 1], [56, 1], [59, 0]], 'power2.inOut');
  absProp(tl, u(h), 'x', [[45, 60], [53, 700]], 'power2.out');
  absProp(tl, u(d), 'x', [[45, 540], [53, 1190]], 'power2.out');
  walkSeg(45, 92, 1);
  settle(92.4);
  // sniff a flower patch
  tl.to(u(d), {bounceAdd: 13, duration: 0.34, ease: 'power2.out'}, 96);
  tl.to(u(d), {neckTurn: 24, duration: 0.34, ease: 'power2.out'}, 96);
  tl.to(u(d), {headTurn: 26, duration: 0.34, ease: 'power2.out'}, 96);
  tl.to(u(d), {neckTurn: 15, duration: 0.22, ease: 'power2.inOut'}, 96.5);
  tl.to(u(d), {neckTurn: 26, duration: 0.22, ease: 'power2.inOut'}, 96.78);
  tl.to(u(d), {neckTurn: -12, duration: 0.46, ease: 'back.out(2.4)'}, 97.06);
  tl.to(u(d), {headTurn: -8, duration: 0.5, ease: 'back.out(2.2)'}, 97.1);
  tl.to(u(d), {bounceAdd: -4, duration: 0.4, ease: 'back.out(2.6)'}, 97.06);
  tl.to(u(h), {headTurn: -9, duration: 0.5, ease: 'power2.out'}, 96.4);
  tl.to(u(h), {headTurn: 0, duration: 0.6, ease: 'power2.inOut'}, 101);
  // the turtle appears way ahead on the path
  absProp(tl, u(x.turtle), 'o', [[98, 0], [100, 1]]);
  absProp(tl, u(x.turtle), 'x', [[98, 1780], [230, 1080]], 'none');
  walkSeg(106, 135, 1);
  tl.to(u(h), {headTurn: -7, duration: 0.6, ease: 'power2.out'}, 112);
  tl.to(u(h), {headTurn: 0, duration: 0.8, ease: 'power2.inOut'}, 126);

  /* ============ act 2 — the pond (135–240) ============ */
  absProp(tl, u(x.card), '2', [[139, 0], [141, 1], [146, 1], [149, 0]], 'power2.inOut');
  walkSeg(135, 158, 1);
  settle(158.4);
  // pond life fades in as the camera arrives
  x.ducks.forEach((dk, i) => {
    absProp(tl, u(dk), 'o', [[150 + i, 0], [152 + i, 1]]);
    absProp(tl, u(dk), 'y', [[150, dk.y], [240, dk.y - 6]], 'sine.inOut');
  });
  absProp(tl, u(x.frog), 'o', [[153, 0], [155, 1]]);
  // dog spots the ducks
  tl.to(u(d), {earPerk: 12, duration: 0.3, ease: 'back.out(3)'}, 162);
  tl.to(u(d), {headTurn: -18, duration: 0.35, ease: 'power2.out'}, 162);
  tl.to(u(d), {bounceAdd: -10, duration: 0.35, ease: 'power2.out'}, 162);
  tl.to(u(d.tail1), {r: 26, duration: 0.2, ease: 'sine.inOut', yoyo: true, repeat: 15}, 162);
  // two barks!
  tl.to(u(d), {bounceAdd: -22, duration: 0.14, ease: 'power2.out', yoyo: true, repeat: 3}, 165.6);
  tl.to(u(d.head), {r: -14, duration: 0.14, ease: 'power2.out', yoyo: true, repeat: 3}, 165.6);
  // ducks scatter — all but the duckling
  const scatterX = [2400, 2560, 2320];
  x.ducks.forEach((dk, i) => {
    tl.to(u(dk), {x: scatterX[i], duration: 1.6, ease: 'power2.in'}, 166.2 + i * 0.12);
  });
  absProp(tl, u(x.duckling), 'o', [[166.5, 0], [167.5, 1]]);
  absProp(tl, u(x.duckling), 'x', [[167, 1800], [176, 1330]], 'power2.inOut');
  tl.to(u(d), {headTurn: 22, duration: 0.4, ease: 'power2.out'}, 176.5);
  tl.to(u(d), {neckTurn: 16, duration: 0.4, ease: 'power2.out'}, 176.5);
  // the girl shares an apple-treat with the pond
  absProp(tl, u(x.bread), 'o', [[180, 0], [180.3, 1]]);
  tl.to(u(x.bread), {x: 1720, duration: 1.3, ease: 'none'}, 180.3);
  tl.to(u(x.bread), {y: 520, duration: 0.65, ease: 'power2.out'}, 180.3);
  tl.to(u(x.bread), {y: 872, duration: 0.65, ease: 'power2.in'}, 180.95);
  tl.to(u(x.bread), {o: 0, duration: 0.4}, 182.4);
  x.ducks.forEach((dk, i) => {
    tl.to(u(dk), {x: 1640 + i * 120, duration: 2.2, ease: 'power2.inOut'}, 182 + i * 0.2);
  });
  // frog hops, delighted
  for (const at of [195, 197.4]) {
    tl.to(u(x.frog), {y: 826, duration: 0.3, ease: 'power2.out', yoyo: true, repeat: 1}, at);
    tl.to(u(x.frog), {x: 1478 - 40 * (at > 196 ? 2 : 1), duration: 0.6, ease: 'power2.out'}, at);
  }
  // duckling joins the dog's side
  absProp(tl, u(x.duckling), 'x', [[200, 1330], [216, 1105]], 'power2.inOut');
  tl.to(u(d), {headTurn: 30, duration: 0.5, ease: 'power2.out'}, 208);
  tl.to(u(d), {headTurn: 0, duration: 0.7, ease: 'power2.inOut'}, 214);
  walkSeg(222, 240, 1);
  absProp(tl, u(x.duckling), 'x', [[222, 1105], [240, 1010]], 'power1.inOut');
  absProp(tl, u(x.duckling), 'o', [[232, 1], [238, 0]]);

  // pond guests head home before the kite chapter
  absProp(tl, u(x.turtle), 'o', [[236, 1], [242, 0]]);
  x.ducks.forEach((dk, i) => absProp(tl, u(dk), 'o', [[300 + i, 1], [304 + i, 0]]));
  absProp(tl, u(x.frog), 'o', [[302, 1], [306, 0]]);

  /* ============ act 3 — the wind & the kite (240–330) ============ */
  absProp(tl, u(x.card), '3', [[244, 0], [246, 1], [251, 1], [254, 0]], 'power2.inOut');
  absProp(tl, u(w), 'wind', [[240, 0.6], [262, 1.5], [318, 1.2], [330, 0.7]]);
  settle(240.2);
  // a kite left on the bench
  absProp(tl, u(x.kite), 'o', [[246, 0], [248, 1]]);
  tl.to(u(x.kite), {x: 800, y: 660, duration: 1.4, ease: 'power2.inOut'}, 252); // picked up
  // run + launch
  walkSeg(256, 268, 1.4, 340, 0.78);
  tl.to(u(x.kite), {y: 250, duration: 5, ease: 'power2.out'}, 258);
  tl.to(u(x.kite), {x: 1120, duration: 5, ease: 'power2.out'}, 258);
  tl.to(u(x.kite), {r: -14, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: 9}, 262);
  tl.to(u(x.kite), {y: 210, duration: 3.1, ease: 'sine.inOut', yoyo: true, repeat: 7}, 264);
  tl.to(u(x.kite), {x: 1240, duration: 4.3, ease: 'sine.inOut', yoyo: true, repeat: 5}, 265);
  settle(268.2);
  // dog watches the kite, hopping
  tl.to(u(d), {headTurn: -30, duration: 0.5, ease: 'power2.out'}, 264);
  tl.to(u(d), {bounceAdd: -16, duration: 0.34, ease: 'sine.inOut', yoyo: true, repeat: 25}, 265);
  // the kite dips, the dog leaps — and misses
  tl.to(u(x.kite), {y: 520, duration: 1.5, ease: 'power2.in'}, 300);
  tl.to(u(d), {bounceAdd: -64, duration: 0.4, ease: 'power2.out'}, 301);
  tl.to(u(d), {bounceAdd: 6, duration: 0.4, ease: 'back.out(3)'}, 301.5);
  tl.to(u(x.kite), {y: 240, duration: 2.2, ease: 'power2.out'}, 301.6);
  // reel in
  tl.to(u(x.kite), {x: 810, y: 650, duration: 2.4, ease: 'power2.inOut'}, 312);
  tl.to(u(x.kite), {o: 0, duration: 0.6}, 315.5);
  walkSeg(320, 330, 1);

  /* ============ act 4 — the rain (330–420) ============ */
  absProp(tl, u(x.card), '4', [[334, 0], [336, 1], [341, 1], [344, 0]], 'power2.inOut');
  settle(330.2);
  absProp(tl, u(x), 'cloudDark', [[332, 0], [350, 1]]);
  absProp(tl, u(x), 'rain', [[350, 0], [353, 1], [385, 1], [395, 0]]);
  absProp(tl, u(w), 'wind', [[330, 0.7], [352, 1.3], [388, 0.5]]);
  // run for the tree
  walkSeg(344, 354, 1.35, 330, 0.82);
  settle(354.3);
  // dog sits, girl hugs herself and shivers
  tl.to(u(d), {sit: 1, duration: 0.55, ease: 'power2.inOut'}, 356);
  tl.to(u(d), {bounceAdd: 4, duration: 0.5, ease: 'power2.out'}, 356);
  tl.to(u(d), {neckTurn: 2, duration: 0.55, ease: 'power2.inOut'}, 356);
  tl.to(u(d), {headTurn: -8, duration: 0.55, ease: 'power2.inOut'}, 356);
  tl.to(u(h.uarmF), {r: -64, duration: 0.5, ease: 'power2.inOut'}, 356.5);
  tl.to(u(h.larmF), {r: -96, duration: 0.5, ease: 'power2.inOut'}, 356.5);
  tl.to(u(h.uarmB), {r: -52, duration: 0.5, ease: 'power2.inOut'}, 356.5);
  tl.to(u(h.larmB), {r: -88, duration: 0.5, ease: 'power2.inOut'}, 356.5);
  tl.to(u(h.torso), {r: 7, duration: 0.5, ease: 'power2.inOut'}, 356.5);
  tl.to(u(h), {bobBase: -6, duration: 0.16, ease: 'shiver', yoyo: true, repeat: 40}, 358);
  // duckling tucks under the dog's tail
  absProp(tl, u(x.duckling), 'o', [[354, 0], [356, 1]]);
  absProp(tl, u(x.duckling), 'x', [[354, 1010], [358, 1085]], 'power2.inOut');
  absProp(tl, u(x.duckling), 'y', [[354, 880], [358, 886]], 'power2.inOut');
  // frog loves the rain
  for (let i = 0; i < 5; i++) {
    tl.to(u(x.frog), {y: 820, duration: 0.28, ease: 'power2.out', yoyo: true, repeat: 1}, 362 + i * 2.6);
  }
  // rain stops → rainbow
  absProp(tl, u(x), 'cloudDark', [[385, 1], [398, 0.15], [410, 0]]);
  absProp(tl, u(x), 'rainbow', [[396, 0], [403, 1], [414, 1], [419, 0]]);
  // dog shakes off
  tl.to(u(d), {pitch: 8, duration: 0.5, ease: 'shake'}, 400);
  tl.to(u(h.uarmF), {r: -18, duration: 0.6, ease: 'power2.inOut'}, 402);
  tl.to(u(h.larmF), {r: -10, duration: 0.6, ease: 'power2.inOut'}, 402);
  tl.to(u(h.uarmB), {r: 8, duration: 0.6, ease: 'power2.inOut'}, 402);
  tl.to(u(h.larmB), {r: 6, duration: 0.6, ease: 'power2.inOut'}, 402);
  tl.to(u(h.torso), {r: 3, duration: 0.6, ease: 'power2.inOut'}, 402);
  tl.to(u(h), {bobBase: 0, duration: 0.4}, 402);
  tl.to(u(d), {sit: 0, duration: 0.5, ease: 'power2.inOut'}, 410);
  tl.to(u(d), {bounceAdd: 0, duration: 0.5, ease: 'power2.inOut'}, 410);

  /* ============ act 5 — a little feast (420–510) ============ */
  absProp(tl, u(x.card), '5', [[424, 0], [426, 1], [431, 1], [434, 0]], 'power2.inOut');
  absProp(tl, u(x), 'tod', [[420, 0.42], [470, 0.66]]);
  absProp(tl, u(x), 'picnic', [[424, 0], [427, 1]]);
  walkSeg(432, 446, 1);
  settle(446.4);
  // dog begs
  tl.to(u(d), {sit: 1, duration: 0.5, ease: 'power2.inOut'}, 450);
  tl.to(u(d), {bounceAdd: 4, duration: 0.5, ease: 'power2.out'}, 450);
  tl.to(u(d.legFL.hip), {r: -42, duration: 0.4, ease: 'back.out(2)'}, 451);
  tl.to(u(d), {neckTurn: 2, duration: 0.5, ease: 'power2.inOut'}, 450);
  tl.to(u(d), {headTurn: -14, duration: 0.5, ease: 'power2.inOut'}, 450);
  // the bone toss + leap catch
  absProp(tl, u(x.bone), 'o', [[456, 0], [456.2, 1]]);
  tl.to(u(x.bone), {x: 1080, duration: 1.0, ease: 'none'}, 456.2);
  tl.to(u(x.bone), {y: 560, duration: 0.5, ease: 'power2.out'}, 456.2);
  tl.to(u(x.bone), {y: 700, duration: 0.5, ease: 'power2.in'}, 456.7);
  tl.to(u(d), {sit: 0.16, duration: 0.3, ease: 'power2.out'}, 456.9);
  tl.to(u(d), {bounceAdd: -54, duration: 0.32, ease: 'power2.out'}, 456.9);
  tl.to(u(d), {neckTurn: -12, duration: 0.3, ease: 'power2.out'}, 456.9);
  tl.to(u(x.bone), {o: 0, duration: 0.12}, 457.15);
  tl.to(u(d), {bounceAdd: 10, duration: 0.34, ease: 'power2.in'}, 457.5);
  tl.to(u(d), {bounceAdd: 4, duration: 0.3, ease: 'back.out(3)'}, 457.85);
  tl.to(u(d), {sit: 1, duration: 0.45, ease: 'power2.inOut'}, 457.6);
  tl.to(u(d.legFL.hip), {r: 0, duration: 0.3}, 457.6);
  // the butterfly lands on the dog's nose — nobody moves
  absProp(tl, u(x.butterfly2), 'o', [[472, 0], [474, 1]]);
  tl.fromTo(u(x.butterfly2), {x: 1500, y: 500}, {x: 1258, y: 636, duration: 2.4, ease: 'power1.inOut'}, 472);
  tl.to(u(d), {headTurn: -4, duration: 0.6, ease: 'power2.inOut'}, 474.6);
  tl.to(u(d), {neckTurn: 0, duration: 0.6, ease: 'power2.inOut'}, 474.6);
  tl.to(u(d), {earPerk: 16, duration: 0.8, ease: 'power2.out'}, 474.6);
  tl.to(u(h), {headTurn: -10, duration: 0.6, ease: 'power2.out'}, 476);
  tl.to(u(h.torso), {r: 8, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 5}, 478); // giggling
  tl.to(u(x.butterfly2), {x: 1600, y: 420, o: 0, duration: 1.8, ease: 'power1.in'}, 494);
  tl.to(u(d), {headTurn: -8, duration: 0.8, ease: 'power2.inOut'}, 495);
  tl.to(u(d), {earPerk: 6, duration: 0.8, ease: 'power2.inOut'}, 495);
  // a bird lands on the bench
  absProp(tl, u(x.birdPerch), 'o', [[486, 0], [488, 1]]);
  tl.fromTo(u(x.birdPerch), {x: 1100, y: 480}, {x: 668, y: 566, duration: 1.6, ease: 'power2.inOut'}, 486);
  tl.to(u(x.birdPerch), {y: 560, duration: 0.22, ease: 'sine.inOut', yoyo: true, repeat: 3}, 492);

  /* ============ act 6 — dusk, going home (510–580) ============ */
  absProp(tl, u(x.card), '6', [[514, 0], [516, 1], [521, 1], [524, 0]], 'power2.inOut');
  absProp(tl, u(x), 'picnic', [[512, 1], [515, 0]]);
  absProp(tl, u(x), 'tod', [[510, 0.66], [556, 0.86], [578, 1]]);
  absProp(tl, u(x), 'lampOn', [[545, 0], [554, 1]]);
  tl.to(u(d), {sit: 0, duration: 0.5, ease: 'power2.inOut'}, 514);
  tl.to(u(d), {bounceAdd: 0, duration: 0.5, ease: 'power2.inOut'}, 514);
  // the ball appears in the dog's mouth for the walk home
  absProp(tl, u(x.ball), 'o', [[518, 0], [520, 1]]);
  walkSeg(518, 566, 0.85, 260);
  settle(566.3);
  // goodbye to the duckling — it falls behind on the path, then a little heart
  absProp(tl, u(x.duckling), 'x', [[512, 1085], [520, 985]], 'power1.inOut');
  absProp(tl, u(x.duckling), 'o', [[536, 0], [538, 1], [544, 1], [547, 0]]);
  // exit right, into the night
  // the shoulder bird flies home
  tl.to(u(x.birdPerch), {x: 1000, y: 300, o: 0, duration: 2.2, ease: 'power2.in'}, 556);
  absProp(tl, u(h), 'x', [[570, 700], [584, 2200]], 'power1.in');
  absProp(tl, u(d), 'x', [[570, 1190], [584, 2650]], 'power1.in');
  absProp(tl, u(x.ball), 'o', [[576, 1], [580, 0]]);

  /* ============ epilogue — night park, credits (580–600) ============ */
  absProp(tl, u(x), 'shoot', [[588, 0], [591.5, 1]]);
  absProp(tl, u(x), 'credit', [[589, 0], [593, 1]]);
  absProp(tl, u(w), 'camScale', [[580, 1.06], [600, 1.0]], 'power1.inOut');
  absProp(tl, u(w), 'camX', [[580, -40], [600, -10]], 'power1.inOut');

  absProp(tl, u(w), 'distance', distanceKeys, 'none');

  /* ============ global ambience ============ */
  tl.fromTo(u(w), {cloud: 0}, {cloud: 420, duration: LDUR, ease: 'none'}, 0);
  absProp(tl, u(w), 'camY', [[0, -10], [600, -18]], 'sine.inOut');
  tl.to(u(w), {flare: 0.6, duration: 2, ease: 'sine.inOut', yoyo: true, repeat: 50}, 40);
  // leash slack lives with the story
  absProp(tl, u(leash), 'slack', [
    [0, 0.55], [45, 0.55], [53, 0.4], [92, 0.5], [135, 0.45], [158, 0.6],
    [222, 0.45], [256, 0.2], [268, 0.5], [344, 0.25], [354, 0.6], [432, 0.45],
    [446, 0.6], [518, 0.5], [566, 0.6], [600, 0.6],
  ]);
  absProp(tl, u(leash), 'tension', [
    [0, 0], [256, 0], [262, 0.6], [268, 0], [344, 0], [350, 0.4], [356, 0], [600, 0],
  ]);

  tl.set({}, {}, LDUR); // pin the duration
  return {tl, state, x};
}

let CACHE: ReturnType<typeof getLongScene> | null = null;
export function longScene(): ReturnType<typeof getLongScene> {
  if (!CACHE) CACHE = getLongScene();
  return CACHE;
}

export function sampleLong(frame: number, fps: number = LFPS): {s: SceneState; x: LongX} {
  const {tl, state, x} = longScene();
  tl.time(Math.min(frame / fps, LDUR - 0.0001), false);
  return {s: state, x};
}
