// The Meridian Vault — the guards. One job: patrol, suspicion and chase.
// A guard walks its waypoints on a BFS path, sweeps its vision cone, and
// turns suspicious at noises, alert when it spots the thief.
import {
  GUARD_PATROL_SPEED, GUARD_CHASE_SPEED, GUARD_RANGE, GUARD_HALF_ANGLE,
  SNEAK_RANGE_FACTOR, SPOT_GRACE_S, COIN_NOISE_RADIUS,
} from './config.js';
import { cellCenter, findPath, canSee, GUARD_DEFS } from './level.js';

export function createGuards() {
  return GUARD_DEFS.map((def) => {
    const start = cellCenter(def.waypoints[0][0], def.waypoints[0][1]);
    return {
      id: def.id,
      waypoints: def.waypoints,
      wpIndex: 1,
      x: start.x,
      y: start.y,
      angle: 0,
      state: 'patrol', // patrol | suspicious | alert
      path: null,
      pathTarget: null,
      waitT: 0,
      alertT: 0,
      loseT: 0,
      repathT: 0,
    };
  });
}

function moveAlongPath(g, dt, speed) {
  if (!g.path || g.path.length === 0) return true;
  const target = g.path[0];
  const dx = target.x - g.x;
  const dy = target.y - g.y;
  const dist = Math.hypot(dx, dy);
  const step = speed * dt;
  if (dist <= Math.max(step, 3)) {
    g.x = target.x;
    g.y = target.y;
    g.path.shift();
    return g.path.length === 0;
  }
  g.x += (dx / dist) * step;
  g.y += (dy / dist) * step;
  g.angle = turnToward(g.angle, Math.atan2(dy, dx), dt * 6);
  return false;
}

function turnToward(angle, target, maxStep) {
  let diff = target - angle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) <= maxStep) return target;
  return angle + Math.sign(diff) * maxStep;
}

function setPath(g, tx, ty) {
  const path = findPath(g.x, g.y, tx, ty);
  g.path = path ? path.slice(1) : null;
  g.pathTarget = { x: tx, y: ty };
}

export function updateGuards(state, dt) {
  const p = state.player;
  for (const g of state.guards) {
    const range = GUARD_RANGE * (p.sneak ? SNEAK_RANGE_FACTOR : 1);
    const sees = state.screen === 'play'
      && canSee(g.x, g.y, g.angle, GUARD_HALF_ANGLE, range, p.x, p.y, state.smokes);

    if (sees) {
      state.spotted = Math.min(1, state.spotted + dt / SPOT_GRACE_S);
      if (state.spotted >= 1 && g.state !== 'alert') {
        g.state = 'alert';
        g.alertT = 4;
        g.loseT = 0;
      }
    }

    // A guard that touches the thief ends the run.
    if (state.screen === 'play' && Math.hypot(p.x - g.x, p.y - g.y) < 26) {
      state.screen = 'caught';
      state.caughtReason = `${g.id} caught you in the open`;
    }

    if (g.state === 'alert') {
      g.alertT -= dt;
      g.repathT -= dt;
      if (sees) {
        g.loseT = 0;
        g.alertT = 4;
        if (g.repathT <= 0) { setPath(g, p.x, p.y); g.repathT = 0.5; }
      } else {
        g.loseT += dt;
        if (g.loseT > 2) {
          g.state = 'suspicious';
          g.waitT = 0;
          setPath(g, p.x, p.y);
        }
      }
      moveAlongPath(g, dt, GUARD_CHASE_SPEED);
      if (g.alertT <= 0 && g.state === 'alert') {
        g.state = 'suspicious';
        g.waitT = 0;
        setPath(g, p.x, p.y);
      }
    } else if (g.state === 'suspicious') {
      if (g.path && g.path.length > 0) {
        if (moveAlongPath(g, dt, GUARD_PATROL_SPEED * 1.3)) {
          g.waitT = 2; // look around where the noise was
          g.path = null;
        }
      } else {
        g.waitT -= dt;
        g.angle += dt * 1.6; // scan the room
        if (g.waitT <= 0) {
          g.state = 'patrol';
          g.wpIndex = nearestWaypoint(g);
          setPathToWaypoint(g);
        }
      }
    } else {
      // Patrol: walk the waypoint loop, pausing a beat at each corner.
      if (!g.path || g.path.length === 0) {
        if (g.waitT > 0) {
          g.waitT -= dt;
          g.angle += dt * 0.5; // a slow sweep while waiting
          if (g.waitT <= 0) {
            g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
            setPathToWaypoint(g);
          }
        } else {
          setPathToWaypoint(g);
        }
      } else if (moveAlongPath(g, dt, GUARD_PATROL_SPEED)) {
        g.path = null;
        g.waitT = 1.2;
      }
    }
  }
}

function nearestWaypoint(g) {
  let best = 0;
  let bestD = Infinity;
  g.waypoints.forEach(([cx, cy], i) => {
    const c = cellCenter(cx, cy);
    const d = (c.x - g.x) ** 2 + (c.y - g.y) ** 2;
    if (d < bestD) { best = i; bestD = d; }
  });
  return best;
}

function setPathToWaypoint(g) {
  const [cx, cy] = g.waypoints[g.wpIndex];
  const c = cellCenter(cx, cy);
  setPath(g, c.x, c.y);
}

// A landed coin pulls nearby guards to the noise.
export function guardsHearCoin(state, x, y) {
  for (const g of state.guards) {
    if (Math.hypot(g.x - x, g.y - y) < COIN_NOISE_RADIUS && g.state !== 'alert') {
      g.state = 'suspicious';
      g.waitT = 0;
      setPath(g, x, y);
    }
  }
}
