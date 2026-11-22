// The Meridian Vault — the game itself. One job: own the state, run the
// loop, wire input to the modules, and expose the shot hooks the screenshot
// tool reads (window.__shotReady / window.__shotState).
import { VIEW_W, VIEW_H, ALARM_RISE_PER_S, ALARM_FALL_PER_S, ALARM_MAX } from './config.js';
import { SPAWN, LOOT, cellCenter } from './level.js';
import { createPlayer, updatePlayer } from './player.js';
import { createGuards, updateGuards, guardsHearCoin } from './guards.js';
import { createCameras, updateCameras } from './cameras.js';
import { useCoin, useSmoke, useEmp } from './tools.js';
import { unlockAudio, sfx, alarmPulse } from './audio.js';
import { render } from './render.js';
import { applyShot } from './shots.js';

export function createState(canvas) {
  const spawn = cellCenter(SPAWN.cx, SPAWN.cy);
  return {
    ctx: canvas.getContext('2d'),
    screen: 'title', // title | play | caught | win
    time: 0,
    alarm: 0,
    spotted: 0, // 0..1: how far through the 0.9s grace the thief is
    score: 0,
    lootValue: 0,
    toolSpend: 0,
    diamondTaken: false,
    empT: 0,
    smokes: [],
    coins: [],
    message: '',
    messageT: 0,
    caughtReason: '',
    winStats: null,
    player: createPlayer(spawn.x, spawn.y),
    guards: createGuards(),
    cameras: createCameras(),
    loot: LOOT.map((item) => {
      const c = cellCenter(item.cx, item.cy);
      return { ...item, x: c.x, y: c.y, taken: false };
    }),
  };
}

function resetState(state) {
  const fresh = createState(state.ctx.canvas);
  // Keep the same canvas context object the page holds.
  fresh.ctx = state.ctx;
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, fresh);
}

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const state = createState(canvas);

const input = { keys: new Set() };

function keyName(e) {
  return e.key.toLowerCase();
}

window.addEventListener('keydown', (e) => {
  unlockAudio();
  const k = keyName(e);
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  input.keys.add(k);
  if (state.screen === 'title' && (k === 'enter' || k === ' ')) {
    state.screen = 'play';
    sfx('pickup');
  } else if (k === 'r' && (state.screen === 'caught' || state.screen === 'win')) {
    resetState(state);
    state.screen = 'play';
  } else if (state.screen === 'play') {
    if (k === '1') useCoin(state, state.player.x + 160, state.player.y);
    else if (k === '2') useSmoke(state);
    else if (k === '3') useEmp(state);
  }
});
window.addEventListener('keyup', (e) => input.keys.delete(keyName(e)));
window.addEventListener('blur', () => input.keys.clear());

canvas.addEventListener('mousedown', (e) => {
  unlockAudio();
  if (state.screen === 'title') { state.screen = 'play'; return; }
  if (state.screen !== 'play') return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = VIEW_W / rect.width;
  const scaleY = VIEW_H / rect.height;
  const tx = (e.clientX - rect.left) * scaleX;
  const ty = (e.clientY - rect.top) * scaleY;
  useCoin(state, tx, ty);
});

// A thrown coin lands at once and pulls nearby guards to the noise.
function landCoins() {
  for (const c of state.coins) {
    if (c.t === 0) {
      c.t = 1;
      guardsHearCoin(state, c.x, c.y);
    }
  }
}

function update(dt) {
  if (state.screen === 'caught' || state.screen === 'win') return;
  if (state.screen === 'title') {
    // Idle drift behind the title so the room is alive: guards patrol.
    updateGuards(state, dt);
    updateCameras(state, dt);
    state.time += dt;
    return;
  }
  state.time += dt;
  state.empT = Math.max(0, state.empT - dt);
  for (const s of state.smokes) s.t -= dt;
  state.smokes = state.smokes.filter((s) => s.t > 0);
  if (state.messageT > 0) state.messageT -= dt;

  updatePlayer(state, dt, input);
  landCoins();
  updateGuards(state, dt);
  updateCameras(state, dt);

  // The alarm climbs only once the thief is fully spotted (past grace).
  if (state.spotted >= 1 && state.screen === 'play') {
    state.alarm = Math.min(ALARM_MAX, state.alarm + ALARM_RISE_PER_S * dt);
    alarmPulse(performance.now());
    if (state.alarm >= ALARM_MAX) {
      state.screen = 'caught';
      state.caughtReason = 'The alarm hit 100% — the building locked down';
      sfx('caught');
    }
  } else {
    state.alarm = Math.max(0, state.alarm - ALARM_FALL_PER_S * dt);
    if (state.screen === 'play') state.spotted = Math.max(0, state.spotted - (dt / 0.9) * 1.5);
  }
}

// ---- shot mode: ?shot=cover|patrol|tools|win poses the game once and
// freezes it, so the screenshot tool captures exactly that frame.
const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
if (shotName) {
  applyShot(shotName, state);
  render(state);
  refreshShotState();
  window.__shotReady = true;
} else {
  let last = performance.now();
  let frames = 0;
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render(state);
    frames += 1;
    if (frames === 2) {
      refreshShotState();
      window.__shotReady = true;
    }
    if (frames % 30 === 0) refreshShotState();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

// The screenshot tool reads this plain object (not a function).
function refreshShotState() {
  window.__shotState = {
    screen: state.screen,
    alarm: Math.round(state.alarm),
    spotted: state.spotted,
    score: state.score,
    lootValue: state.lootValue,
    lootTaken: state.loot.filter((l) => l.taken).length,
    diamondTaken: state.diamondTaken,
    time: Math.round(state.time),
    player: { x: Math.round(state.player.x), y: Math.round(state.player.y) },
    guards: state.guards.map((g) => ({ id: g.id, state: g.state, x: Math.round(g.x), y: Math.round(g.y) })),
    cameras: state.cameras.map((c) => ({ id: c.id, disabled: c.disabledT > 0 })),
    errors: window.__errors ?? [],
  };
}

window.addEventListener('error', (e) => {
  (window.__errors ??= []).push(String(e.message));
});
