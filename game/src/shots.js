// The Meridian Vault — screenshot poses. One job: put the game into a
// fixed, readable state for each named screenshot (?shot=cover|patrol|
// tools|win). The poses are deterministic so the four screenshots each show
// the game at its best: room, guards with cones, cameras, loot, alarm.
import { cellCenter } from './level.js';
import { finishScore } from './player.js';

function placePlayer(state, cx, cy) {
  const c = cellCenter(cx, cy);
  state.player.x = c.x;
  state.player.y = c.y;
}

function placeGuard(state, index, cx, cy, angle) {
  const g = state.guards[index];
  const c = cellCenter(cx, cy);
  g.x = c.x;
  g.y = c.y;
  g.angle = angle;
  g.path = null;
  g.state = 'patrol';
}

export function applyShot(name, state) {
  state.screen = 'play';
  state.messageT = 0;
  state.smokes = [];
  state.coins = [];
  state.empT = 0;
  for (const item of state.loot) item.taken = false;

  if (name === 'cover') {
    // Mid-heist: the thief crosses the hall, a guard's cone sweeps across
    // them, a camera watches the vault, the diamond glints, alarm at 35.
    placePlayer(state, 10, 9);
    state.player.dir = Math.PI / 4;
    placeGuard(state, 0, 13, 9, Math.PI); // Rook looks back at the thief
    placeGuard(state, 1, 16, 3, Math.PI / 2); // Bishop patrols the corridor
    placeGuard(state, 2, 4, 8, 0.3); // Knight in the gallery
    state.cameras[0].angle = Math.PI / 2 + 0.4;
    state.cameras[1].angle = Math.PI - 0.5;
    state.cameras[2].angle = 0.2;
    state.loot[0].taken = true; // one case already lifted
    state.lootValue = 100;
    state.score = 100;
    state.alarm = 35;
    state.spotted = 0.4;
    state.time = 45;
    state.message = 'One case down — the vault is next';
    state.messageT = 99;
  } else if (name === 'patrol') {
    // The thief waits in cover while the patrols cross the hall.
    placePlayer(state, 11, 9);
    state.player.sneak = true;
    state.player.dir = 0;
    placeGuard(state, 0, 16, 7, Math.PI / 2);
    placeGuard(state, 1, 12, 2, 0);
    placeGuard(state, 2, 3, 10, -0.4);
    state.cameras[0].angle = Math.PI / 2 - 0.5;
    state.cameras[1].angle = Math.PI + 0.3;
    state.cameras[2].angle = -0.3;
    state.alarm = 8;
    state.spotted = 0;
    state.time = 20;
    state.message = 'Hold still — let the patrol pass';
    state.messageT = 99;
  } else if (name === 'tools') {
    // Smoke out, camera EMP'd, thief at the vault door, alarm climbing.
    placePlayer(state, 24, 4);
    state.player.dir = Math.PI;
    placeGuard(state, 0, 18, 10, -Math.PI / 2);
    placeGuard(state, 1, 20, 4, Math.PI);
    placeGuard(state, 2, 5, 9, 0.8);
    state.smokes.push({ x: 19 * 40 + 20, y: 10 * 40 + 20, r: 72, t: 6 });
    state.cameras[1].disabledT = 5;
    state.cameras[0].angle = Math.PI / 2 + 0.7;
    state.cameras[2].angle = 0.5;
    state.loot[0].taken = true;
    state.loot[1].taken = true;
    state.lootValue = 200;
    state.score = 125; // 200 loot, 75 spent on the EMP
    state.toolSpend = 75;
    state.alarm = 58;
    state.spotted = 1;
    state.time = 90;
    state.message = 'Smoke up, camera dark — move!';
    state.messageT = 99;
  } else if (name === 'win') {
    // The payoff screen: the getaway, with the score breakdown.
    state.screen = 'win';
    state.diamondTaken = true;
    state.lootValue = 750;
    state.score = 675; // loot 750 minus 75 spent on tools; +36 time bonus = 711
    state.toolSpend = 75;
    state.time = 132;
    for (const item of state.loot) item.taken = true;
    state.winStats = finishScore(state);
    placePlayer(state, 16, 16);
  }
}
