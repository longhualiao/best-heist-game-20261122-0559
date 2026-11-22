// The Meridian Vault — tuning constants. One job: numbers, no logic.
// Canvas is 1280x800: the playfield is the top 720px, the HUD bar is the
// bottom 80px, so every screenshot shows the whole game in one frame.
export const VIEW_W = 1280;
export const VIEW_H = 800;
export const FIELD_H = 720;
export const CELL = 40;
export const COLS = 32;
export const ROWS = 18;

// Movement (px per second).
export const WALK_SPEED = 132;
export const SNEAK_SPEED = 66;
export const VENT_SPEED = 58;
export const GUARD_PATROL_SPEED = 46;
export const GUARD_CHASE_SPEED = 82;

// Vision.
export const GUARD_RANGE = 195;
export const GUARD_HALF_ANGLE = 0.58; // ~33 degrees each side
export const CAMERA_RANGE = 215;
export const CAMERA_HALF_ANGLE = 0.55;
export const SNEAK_RANGE_FACTOR = 0.7; // sneaking shrinks how far you are seen
export const SPOT_GRACE_S = 0.9; // time inside a cone before the alarm climbs
export const ALARM_RISE_PER_S = 24;
export const ALARM_FALL_PER_S = 7;
export const ALARM_MAX = 100;

// Tools (score cost).
export const COST_COIN = 25;
export const COST_SMOKE = 50;
export const COST_EMP = 75;
export const SMOKE_RADIUS = 72;
export const SMOKE_DURATION_S = 6;
export const EMP_DURATION_S = 8;
export const COIN_NOISE_RADIUS = 220;
export const LOCKPICK_S = 2.5;

// Scoring.
export const LOOT_CASE = 100;
export const LOOT_GOLD = 150;
export const LOOT_DIAMOND = 500;
export const TIME_BONUS_MAX = 300;
export const TIME_BONUS_DECAY_PER_S = 2;

// Palette.
export const COLORS = {
  floorA: '#171c2e',
  floorB: '#141828',
  officeFloor: '#1a2236',
  galleryFloor: '#221a33',
  vaultFloor: '#2e2412',
  lobbyFloor: '#12262a',
  ventFloor: '#0c0f1c',
  wall: '#3a4260',
  wallTop: '#565f86',
  crate: '#6b4f2a',
  crateTop: '#8a6a38',
  caseGlass: '#7fd4ff',
  gold: '#ffd34d',
  diamond: '#b8f4ff',
  exit: '#1f9d63',
  exitStripe: '#27c07a',
  player: '#2dd4bf',
  playerDark: '#0f766e',
  guard: '#f87171',
  guardDark: '#991b1b',
  coneGuard: 'rgba(248, 113, 113, 0.20)',
  coneGuardEdge: 'rgba(248, 113, 113, 0.55)',
  coneCamera: 'rgba(251, 191, 36, 0.18)',
  coneCameraEdge: 'rgba(251, 191, 36, 0.5)',
  smoke: 'rgba(148, 163, 184, 0.55)',
  hudBg: '#0b0e1a',
  hudLine: '#232a45',
  text: '#e5e7eb',
  dim: '#9ca3af',
  alarm: '#ef4444',
  alarmBg: '#3f1d1d',
  danger: '#f87171',
  good: '#34d399',
};
