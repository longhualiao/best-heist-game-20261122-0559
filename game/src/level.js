// The Meridian Vault — the floor plan. One job: the map and the geometry
// every other module asks about (solid cells, line of sight, BFS paths).
import { CELL, COLS, ROWS, LOOT_CASE, LOOT_GOLD, LOOT_DIAMOND, SMOKE_RADIUS } from './config.js';

// Wall rectangles in cell coords: [x, y, w, h]. The floor is one open plan
// with four named areas: Security Office (top-left), Gallery (left),
// Central Hall + Corridor (middle), the Vault (top-right), Lobby (bottom),
// joined by doors and by a vent shaft (row 13) with three grates.
const WALL_RECTS = [
  // Outer border.
  [0, 0, 32, 1], [0, 17, 32, 1], [0, 0, 1, 18], [31, 0, 1, 18],
  // Office right wall (x=8, rows 1-4), door gap at row 2.
  [8, 1, 1, 1], [8, 3, 1, 2],
  // Office / gallery divider (y=5, x=1-7), door gap at x=4.
  [1, 5, 3, 1], [5, 5, 3, 1],
  // Vault left wall (x=23, rows 1-5), door gap at row 3.
  [23, 1, 1, 2], [23, 4, 1, 2],
  // Vault bottom wall (y=6, x=24-30), door gap at x=27.
  [24, 6, 3, 1], [28, 6, 3, 1],
  // Gallery right wall (x=8, rows 6-11), door gaps at rows 8 and 11.
  [8, 6, 1, 2], [8, 9, 1, 2],
  // Gallery bottom wall (y=12, x=1-7), grate gap at x=4.
  [1, 12, 3, 1], [5, 12, 3, 1],
  // Hall / vent divider (y=12, x=9-22), grate gap at x=16.
  [9, 12, 7, 1], [17, 12, 6, 1],
  // Right hall / vent divider (y=12, x=23-30), grate gap at x=27.
  [23, 12, 4, 1], [28, 12, 3, 1],
  // Vent / lobby divider (y=14, x=1-30), grate gaps at x=4, 16, 28.
  [1, 14, 3, 1], [5, 14, 11, 1], [17, 14, 11, 1], [29, 14, 2, 1],
];

// Crates: cover that blocks movement and sight.
const CRATES = [
  [12, 8], [13, 8], [18, 10], [19, 10], [11, 11], [21, 9],
  [14, 3], [6, 7], [3, 11], [6, 16], [24, 16],
];

// Vent shaft: row 13, x=1..30. The thief crawls through unseen; guards
// never path through it.
const VENT_ROW = 13;

export const LOOT = [
  { kind: 'case', cx: 2, cy: 8, value: LOOT_CASE, label: 'Display case' },
  { kind: 'case', cx: 5, cy: 10, value: LOOT_CASE, label: 'Display case' },
  { kind: 'gold', cx: 3, cy: 2, value: LOOT_GOLD, label: 'Gold bars' },
  { kind: 'diamond', cx: 27, cy: 3, value: LOOT_DIAMOND, label: 'Meridian Diamond' },
];

export const CAMERAS = [
  { id: 'A', cx: 16, cy: 0, baseAngle: Math.PI / 2, sweep: 0.9, speed: 0.55, label: 'Corridor cam' },
  { id: 'B', cx: 30, cy: 3, baseAngle: Math.PI, sweep: 0.8, speed: 0.7, label: 'Vault cam' },
  { id: 'C', cx: 1, cy: 9, baseAngle: 0, sweep: 0.9, speed: 0.5, label: 'Gallery cam' },
];

export const GUARD_DEFS = [
  {
    id: 'Rook', waypoints: [[10, 7], [20, 7], [20, 11], [10, 11]],
  },
  {
    id: 'Bishop', waypoints: [[10, 2], [22, 2], [22, 5], [10, 5]],
  },
  {
    id: 'Knight',
    waypoints: [[2, 7], [6, 11], [4, 4], [2, 2], [8, 2], [12, 3], [16, 5], [10, 7], [8, 8]],
  },
];

export const SPAWN = { cx: 16, cy: 16 };
// The getaway: the entry doors at the bottom centre.
export const EXIT_RECT = { x0: 14 * CELL, y0: 16 * CELL, x1: 19 * CELL, y1: 17 * CELL };

// Room tints, drawn under the floor tiles: [x, y, w, h, key].
export const ROOM_TINTS = [
  [1, 1, 7, 4, 'officeFloor'],
  [1, 6, 7, 6, 'galleryFloor'],
  [24, 1, 7, 5, 'vaultFloor'],
  [1, 15, 30, 2, 'lobbyFloor'],
  [1, 13, 30, 1, 'ventFloor'],
];

function buildGrid() {
  const solid = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
  const vent = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
  for (const [x, y, w, h] of WALL_RECTS) {
    for (let cy = y; cy < y + h; cy += 1) {
      for (let cx = x; cx < x + w; cx += 1) solid[cy][cx] = true;
    }
  }
  for (const [cx, cy] of CRATES) solid[cy][cx] = true;
  for (const item of LOOT) solid[item.cy][item.cx] = true;
  for (let cx = 1; cx <= 30; cx += 1) vent[VENT_ROW][cx] = true;
  return { solid, vent };
}

const { solid, vent } = buildGrid();

export function inBounds(cx, cy) {
  return cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS;
}
export function isSolidCell(cx, cy) {
  if (!inBounds(cx, cy)) return true;
  return solid[cy][cx];
}
export function isVentCell(cx, cy) {
  if (!inBounds(cx, cy)) return false;
  return vent[cy][cx];
}
export function cellKind(cx, cy) {
  if (!inBounds(cx, cy)) return 'wall';
  if (vent[cy][cx]) return 'vent';
  const loot = LOOT.find((l) => l.cx === cx && l.cy === cy);
  if (loot) return loot.kind;
  if (CRATES.some(([x, y]) => x === cx && y === cy)) return 'crate';
  if (solid[cy][cx]) return 'wall';
  return 'floor';
}

export function cellOf(px, py) {
  return { cx: Math.floor(px / CELL), cy: Math.floor(py / CELL) };
}
export function cellCenter(cx, cy) {
  return { x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2 };
}

// True when the segment between two points crosses no solid cell.
export function losClear(x0, y0, x1, y1) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / 5));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const { cx, cy } = cellOf(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
    if (isSolidCell(cx, cy)) return false;
  }
  return true;
}

// Breadth-first path over floor cells (guards never use vents).
// Returns pixel waypoints (cell centres), or null when unreachable.
export function findPath(sx, sy, tx, ty) {
  const start = cellOf(sx, sy);
  const goal = cellOf(tx, ty);
  if (isSolidCell(goal.cx, goal.cy) || isVentCell(goal.cx, goal.cy)) return null;
  const key = (cx, cy) => `${cx},${cy}`;
  const prev = new Map();
  const queue = [[start.cx, start.cy]];
  prev.set(key(start.cx, start.cy), null);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (queue.length > 0) {
    const [cx, cy] = queue.shift();
    if (cx === goal.cx && cy === goal.cy) {
      const cells = [];
      let cur = [cx, cy];
      while (cur) {
        cells.unshift(cur);
        cur = prev.get(key(cur[0], cur[1]));
      }
      return cells.map(([ccx, ccy]) => cellCenter(ccx, ccy));
    }
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!inBounds(nx, ny) || isSolidCell(nx, ny) || isVentCell(nx, ny)) continue;
      if (prev.has(key(nx, ny))) continue;
      prev.set(key(nx, ny), [cx, cy]);
      queue.push([nx, ny]);
    }
  }
  return null;
}

// Can a watcher at (ox, oy) facing `angle` see the point (px, py)?
// Checks range, cone angle, line of sight, vents and smoke.
export function canSee(ox, oy, angle, halfAngle, range, px, py, smokes) {
  const dx = px - ox;
  const dy = py - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  let diff = Math.atan2(dy, dx) - angle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) > halfAngle) return false;
  const { cx, cy } = cellOf(px, py);
  if (isVentCell(cx, cy)) return false;
  if (!losClear(ox, oy, px, py)) return false;
  for (const s of smokes) {
    if (Math.hypot(px - s.x, py - s.y) < SMOKE_RADIUS) return false;
    // A smoke cloud between watcher and target blocks the view.
    const segLen = dist;
    const t = Math.max(0, Math.min(1, ((s.x - ox) * dx + (s.y - oy) * dy) / (segLen * segLen)));
    const qx = ox + dx * t;
    const qy = oy + dy * t;
    if (Math.hypot(s.x - qx, s.y - qy) < SMOKE_RADIUS) return false;
  }
  return true;
}

// Circle (px, py, r) against solid cells: the axis-separated resolve the
// player uses — try x, then y, keeping the circle out of solid cells.
export function moveCircle(x, y, r, dx, dy) {
  let nx = x + dx;
  if (circleHitsSolid(nx, y, r)) nx = x;
  let ny = y + dy;
  if (circleHitsSolid(nx, ny, r)) ny = y;
  return { x: nx, y: ny };
}

function circleHitsSolid(px, py, r) {
  const x0 = Math.floor((px - r) / CELL);
  const x1 = Math.floor((px + r) / CELL);
  const y0 = Math.floor((py - r) / CELL);
  const y1 = Math.floor((py + r) / CELL);
  for (let cy = y0; cy <= y1; cy += 1) {
    for (let cx = x0; cx <= x1; cx += 1) {
      if (!isSolidCell(cx, cy)) continue;
      const nearestX = Math.max(cx * CELL, Math.min(px, (cx + 1) * CELL));
      const nearestY = Math.max(cy * CELL, Math.min(py, (cy + 1) * CELL));
      if ((px - nearestX) ** 2 + (py - nearestY) ** 2 < r * r) return true;
    }
  }
  return false;
}
