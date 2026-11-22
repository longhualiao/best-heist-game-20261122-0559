// The Meridian Vault — the thief. One job: movement, sneaking, picking
// things up, and the lockpick channel on the diamond.
import {
  WALK_SPEED, SNEAK_SPEED, VENT_SPEED, LOCKPICK_S, FIELD_H,
} from './config.js';
import { cellOf, isVentCell, moveCircle } from './level.js';
import { sfx } from './audio.js';

export function createPlayer(x, y) {
  return {
    x, y, r: 12, dir: -Math.PI / 2, sneak: false, moving: false,
    lockpick: 0, // 0..1 progress on the diamond case
  };
}

export function updatePlayer(state, dt, input) {
  const p = state.player;
  if (state.screen !== 'play') return;

  let mx = 0;
  let my = 0;
  if (input.keys.has('arrowleft') || input.keys.has('a')) mx -= 1;
  if (input.keys.has('arrowright') || input.keys.has('d')) mx += 1;
  if (input.keys.has('arrowup') || input.keys.has('w')) my -= 1;
  if (input.keys.has('arrowdown') || input.keys.has('s')) my += 1;

  p.sneak = input.keys.has('shift');
  p.moving = mx !== 0 || my !== 0;

  const { cx, cy } = cellOf(p.x, p.y);
  const inVent = isVentCell(cx, cy);
  const speed = inVent ? VENT_SPEED : p.sneak ? SNEAK_SPEED : WALK_SPEED;
  if (p.moving) {
    const len = Math.hypot(mx, my);
    const step = speed * dt;
    const moved = moveCircle(p.x, p.y, p.r, (mx / len) * step, (my / len) * step);
    p.x = moved.x;
    p.y = moved.y;
    p.dir = Math.atan2(my, mx);
    p.lockpick = 0; // moving breaks the lockpick
  }

  // Clamp inside the playfield (the walls already stop the thief, this is
  // a belt under the braces for the HUD edge).
  p.x = Math.max(p.r + 2, Math.min(1280 - p.r - 2, p.x));
  p.y = Math.max(p.r + 2, Math.min(FIELD_H - p.r - 2, p.y));

  // Interact: hold E near loot to take it; the diamond needs a channel.
  if (input.keys.has('e')) {
    const near = nearestLoot(state, 62);
    if (near && !near.taken) {
      if (near.kind === 'diamond') {
        p.lockpick += dt / LOCKPICK_S;
        if (Math.random() < dt * 6) sfx('lockpick');
        if (p.lockpick >= 1) collectLoot(state, near);
      } else {
        collectLoot(state, near);
      }
    } else {
      p.lockpick = 0;
    }
  } else {
    p.lockpick = 0;
  }

  // Win: diamond in hand and back at the getaway doors.
  if (state.diamondTaken
    && p.x > 14 * 40 && p.x < 19 * 40 && p.y > 16 * 40) {
    state.screen = 'win';
    state.winStats = finishScore(state);
    sfx('win');
  }
}

function nearestLoot(state, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const item of state.loot) {
    if (item.taken) continue;
    const d = Math.hypot(item.x - state.player.x, item.y - state.player.y);
    if (d < bestD) { best = item; bestD = d; }
  }
  return best;
}

function collectLoot(state, item) {
  item.taken = true;
  state.lootValue += item.value;
  state.score += item.value;
  if (item.kind === 'diamond') {
    state.diamondTaken = true;
    state.message = 'The Meridian Diamond is yours — get to the getaway doors!';
    sfx('diamond');
  } else {
    state.message = `${item.label} taken (+${item.value} pts)`;
    sfx('pickup');
  }
  state.messageT = 3;
}

export function finishScore(state) {
  const bonus = Math.max(0, 300 - Math.floor(state.time * 2));
  return {
    loot: state.lootValue,
    timeBonus: bonus,
    toolSpend: state.toolSpend,
    total: state.lootValue + bonus - state.toolSpend,
    time: state.time,
  };
}
