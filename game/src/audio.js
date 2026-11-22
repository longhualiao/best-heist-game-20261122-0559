// The Meridian Vault — sound. One job: tiny synthesized effects, no assets.
// Everything is a WebAudio oscillator, so the game ships no sound files.
let ctx = null;
let alarmLast = 0;

export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq, dur, type = 'sine', gain = 0.08, when = 0, slideTo = null) {
  if (!ctx) return;
  try {
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {
    // Audio is decoration; a failure never breaks the game.
  }
}

export function sfx(name) {
  if (!ctx) return;
  switch (name) {
    case 'pickup':
      tone(880, 0.09, 'sine', 0.09);
      tone(1318, 0.14, 'sine', 0.09, 0.07);
      break;
    case 'coin':
      tone(1200, 0.07, 'triangle', 0.08);
      break;
    case 'smoke':
      tone(300, 0.25, 'sine', 0.06, 0, 140);
      break;
    case 'emp':
      tone(900, 0.35, 'sawtooth', 0.05, 0, 120);
      break;
    case 'lockpick':
      tone(1500, 0.05, 'square', 0.04);
      break;
    case 'diamond':
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'sine', 0.09, i * 0.09));
      break;
    case 'caught':
      tone(420, 0.5, 'sawtooth', 0.1, 0, 90);
      tone(210, 0.6, 'sawtooth', 0.08, 0.12, 60);
      break;
    case 'win':
      [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.2, 'triangle', 0.09, i * 0.1));
      break;
    case 'deny':
      tone(180, 0.12, 'square', 0.05);
      break;
    default:
      break;
  }
}

// A soft alarm pulse while a watcher has the thief spotted; throttled so it
// fires at most twice a second.
export function alarmPulse(nowMs) {
  if (!ctx) return;
  if (nowMs - alarmLast < 500) return;
  alarmLast = nowMs;
  tone(220, 0.12, 'square', 0.045);
  tone(196, 0.12, 'square', 0.045, 0.14);
}
