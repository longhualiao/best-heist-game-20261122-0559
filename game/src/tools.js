// The Meridian Vault — the thief's tools. One job: what each tool does and
// what it costs. Tools are bought with score, so every use is a trade.
import {
  COST_COIN, COST_SMOKE, COST_EMP, SMOKE_RADIUS, SMOKE_DURATION_S,
  EMP_DURATION_S, FIELD_H,
} from './config.js';
import { sfx } from './audio.js';

export function useCoin(state, tx, ty) {
  if (state.screen !== 'play') return false;
  state.score -= COST_COIN;
  state.toolSpend += COST_COIN;
  const target = { x: Math.max(20, Math.min(1260, tx)), y: Math.max(20, Math.min(FIELD_H - 20, ty)) };
  state.coins.push({ ...target, t: 0 });
  state.message = `Coin tossed (-${COST_COIN} pts) — guards go look`;
  state.messageT = 2.5;
  sfx('coin');
  return true;
}

export function useSmoke(state) {
  if (state.screen !== 'play') return false;
  state.score -= COST_SMOKE;
  state.toolSpend += COST_SMOKE;
  state.smokes.push({ x: state.player.x, y: state.player.y, r: SMOKE_RADIUS, t: SMOKE_DURATION_S });
  state.message = `Smoke out (-${COST_SMOKE} pts) — cones cannot see through it`;
  state.messageT = 2.5;
  sfx('smoke');
  return true;
}

export function useEmp(state) {
  if (state.screen !== 'play') return false;
  if (state.empT > 0) {
    state.message = 'EMP already running — cameras are dark';
    state.messageT = 1.5;
    sfx('deny');
    return false;
  }
  state.score -= COST_EMP;
  state.toolSpend += COST_EMP;
  state.empT = EMP_DURATION_S;
  state.message = `EMP pulse (-${COST_EMP} pts) — all cameras dark for ${EMP_DURATION_S}s`;
  state.messageT = 2.5;
  sfx('emp');
  return true;
}
