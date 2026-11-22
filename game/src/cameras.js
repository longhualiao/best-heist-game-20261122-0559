// The Meridian Vault — the security cameras. One job: sweep a cone and
// spot the thief. An EMP pulse knocks them out for a few seconds.
import { CAMERA_RANGE, CAMERA_HALF_ANGLE, SNEAK_RANGE_FACTOR, SPOT_GRACE_S } from './config.js';
import { cellCenter, canSee } from './level.js';
import { CAMERAS } from './level.js';

export function createCameras() {
  return CAMERAS.map((def) => {
    const c = cellCenter(def.cx, def.cy);
    return {
      id: def.id,
      label: def.label,
      x: c.x,
      y: c.y,
      baseAngle: def.baseAngle,
      sweep: def.sweep,
      speed: def.speed,
      angle: def.baseAngle,
      phase: Math.random() * Math.PI * 2,
      disabledT: 0,
    };
  });
}

export function updateCameras(state, dt) {
  const p = state.player;
  for (const cam of state.cameras) {
    cam.angle = cam.baseAngle + Math.sin(state.time * cam.speed + cam.phase) * cam.sweep;
    if (state.empT > 0) cam.disabledT = state.empT;
    else cam.disabledT = Math.max(0, cam.disabledT - dt);
    if (cam.disabledT > 0 || state.screen !== 'play') continue;
    const range = CAMERA_RANGE * (p.sneak ? SNEAK_RANGE_FACTOR : 1);
    if (canSee(cam.x, cam.y, cam.angle, CAMERA_HALF_ANGLE, range, p.x, p.y, state.smokes)) {
      state.spotted = Math.min(1, state.spotted + dt / SPOT_GRACE_S);
    }
  }
}
