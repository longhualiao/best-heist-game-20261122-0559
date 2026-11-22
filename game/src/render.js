// The Meridian Vault — drawing. One job: paint the state on the canvas.
// The whole game is one 1280x800 frame: the floor on top, the HUD bar
// below, so the cover screenshot shows every required element at once.
import {
  VIEW_W, VIEW_H, FIELD_H, CELL, COLS, ROWS, COLORS,
  GUARD_RANGE, GUARD_HALF_ANGLE, CAMERA_RANGE, CAMERA_HALF_ANGLE,
} from './config.js';
import { cellKind, cellCenter, ROOM_TINTS, EXIT_RECT } from './level.js';

function roomFloorColor(cx, cy) {
  if (cy >= 1 && cy <= 4 && cx >= 1 && cx <= 7) return COLORS.officeFloor;
  if (cy >= 6 && cy <= 11 && cx >= 1 && cx <= 7) return COLORS.galleryFloor;
  if (cy >= 1 && cy <= 5 && cx >= 24 && cx <= 30) return COLORS.vaultFloor;
  if (cy >= 15 && cx >= 1 && cx <= 30) return COLORS.lobbyFloor;
  if (cy === 13) return COLORS.ventFloor;
  return (cx + cy) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
}

function drawCone(ctx, x, y, angle, halfAngle, range, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle - halfAngle) * range, y + Math.sin(angle - halfAngle) * range);
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle + halfAngle) * range, y + Math.sin(angle + halfAngle) * range);
  ctx.stroke();
}

function drawFloor(ctx) {
  for (let cy = 0; cy < ROWS; cy += 1) {
    for (let cx = 0; cx < COLS; cx += 1) {
      const kind = cellKind(cx, cy);
      const x = cx * CELL;
      const y = cy * CELL;
      if (kind === 'wall') {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, CELL, CELL);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x, y, CELL, 4);
        continue;
      }
      ctx.fillStyle = roomFloorColor(cx, cy);
      ctx.fillRect(x, y, CELL, CELL);
      if (kind === 'vent') {
        // Vent shaft: dark with grate bars.
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x, y + 6, CELL, 4);
        ctx.fillRect(x, y + 18, CELL, 4);
        ctx.fillRect(x, y + 30, CELL, 4);
        ctx.fillStyle = '#39415f';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        if (cx % 8 === 1) ctx.fillText('VENT SHAFT', x + CELL / 2, y + 15);
      }
    }
  }
  // Room labels, small and out of the way.
  ctx.fillStyle = 'rgba(229,231,235,0.35)';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SECURITY OFFICE', 52, 70);
  ctx.fillText('GALLERY', 52, 270);
  ctx.fillText('THE VAULT', 1010, 70);
  ctx.fillText('LOBBY', 52, 660);
  ctx.fillText('CENTRAL HALL', 420, 250);
}

function drawExit(ctx, time) {
  const { x0, y0, x1, y1 } = EXIT_RECT;
  const pulse = 0.55 + 0.2 * Math.sin(time * 3);
  ctx.fillStyle = `rgba(31, 157, 99, ${pulse})`;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.strokeStyle = COLORS.exitStripe;
  ctx.lineWidth = 3;
  ctx.strokeRect(x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4);
  ctx.fillStyle = '#d1fae5';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GETAWAY', (x0 + x1) / 2, y0 + 25);
}

function drawLoot(ctx, state) {
  for (const item of state.loot) {
    const { x, y } = cellCenter(item.cx, item.cy);
    if (item.kind === 'case') {
      ctx.fillStyle = item.taken ? '#1f2937' : '#0e7490';
      ctx.fillRect(x - 18, y - 18, 36, 36);
      ctx.strokeStyle = COLORS.caseGlass;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 18, y - 18, 36, 36);
      if (!item.taken) {
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff7cc';
        ctx.beginPath();
        ctx.arc(x - 3, y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (item.kind === 'gold') {
      if (item.taken) continue;
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(x - 14, y - 8, 28, 16);
      ctx.fillStyle = '#fff3b0';
      ctx.fillRect(x - 14, y - 8, 28, 5);
    } else if (item.kind === 'diamond') {
      // Pedestal + the diamond.
      ctx.fillStyle = '#4b5563';
      ctx.beginPath();
      ctx.arc(x, y, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6b7280';
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      if (!item.taken) {
        const tw = 0.7 + 0.3 * Math.sin(state.time * 4);
        ctx.save();
        ctx.translate(x, y - 2);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = COLORS.diamond;
        ctx.globalAlpha = tw;
        ctx.fillRect(-9, -9, 18, 18);
        ctx.globalAlpha = 1;
        ctx.restore();
        ctx.fillStyle = 'rgba(184, 244, 255, 0.9)';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('◆ DIAMOND ◆', x, y + 30);
      }
    }
  }
}

function drawCrates(ctx) {
  for (let cy = 0; cy < ROWS; cy += 1) {
    for (let cx = 0; cx < COLS; cx += 1) {
      if (cellKind(cx, cy) !== 'crate') continue;
      const x = cx * CELL;
      const y = cy * CELL;
      ctx.fillStyle = COLORS.crate;
      ctx.fillRect(x + 3, y + 3, CELL - 6, CELL - 6);
      ctx.fillStyle = COLORS.crateTop;
      ctx.fillRect(x + 3, y + 3, CELL - 6, 6);
      ctx.strokeStyle = '#3f2d16';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 3, y + 3, CELL - 6, CELL - 6);
      ctx.beginPath();
      ctx.moveTo(x + 3, y + 3);
      ctx.lineTo(x + CELL - 3, y + CELL - 3);
      ctx.moveTo(x + CELL - 3, y + 3);
      ctx.lineTo(x + 3, y + CELL - 3);
      ctx.stroke();
    }
  }
}

function drawSmoke(ctx, state) {
  for (const s of state.smokes) {
    ctx.fillStyle = COLORS.smoke;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(226, 232, 240, 0.5)';
    ctx.beginPath();
    ctx.arc(s.x - 18, s.y - 10, s.r * 0.4, 0, Math.PI * 2);
    ctx.arc(s.x + 16, s.y + 12, s.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCones(ctx, state) {
  for (const cam of state.cameras) {
    if (cam.disabledT > 0) continue;
    drawCone(ctx, cam.x, cam.y, cam.angle, CAMERA_HALF_ANGLE, CAMERA_RANGE,
      COLORS.coneCamera, COLORS.coneCameraEdge);
  }
  for (const g of state.guards) {
    const alert = g.state === 'alert';
    const susp = g.state === 'suspicious';
    drawCone(ctx, g.x, g.y, g.angle, GUARD_HALF_ANGLE, GUARD_RANGE,
      alert ? 'rgba(239, 68, 68, 0.28)' : susp ? 'rgba(251, 146, 60, 0.22)' : COLORS.coneGuard,
      alert ? 'rgba(239, 68, 68, 0.7)' : susp ? 'rgba(251, 146, 60, 0.6)' : COLORS.coneGuardEdge);
  }
}

function drawCameras(ctx, state) {
  for (const cam of state.cameras) {
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.rotate(cam.angle);
    ctx.fillStyle = cam.disabledT > 0 ? '#4b5563' : '#d1d5db';
    ctx.fillRect(-4, -7, 14, 14);
    ctx.fillStyle = cam.disabledT > 0 ? '#374151' : '#f59e0b';
    ctx.beginPath();
    ctx.arc(12, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (cam.disabledT > 0) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`EMP ${Math.ceil(cam.disabledT)}s`, cam.x, cam.y - 16);
    }
  }
}

function drawGuards(ctx, state) {
  for (const g of state.guards) {
    ctx.fillStyle = COLORS.guardDark;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.guard;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 11, 0, Math.PI * 2);
    ctx.fill();
    // Facing tick.
    ctx.strokeStyle = '#fecaca';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.angle) * 15, g.y + Math.sin(g.angle) * 15);
    ctx.stroke();
    // State mark.
    if (g.state === 'alert' || g.state === 'suspicious') {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(g.state === 'alert' ? '!' : '?', g.x, g.y - 18);
    }
    ctx.fillStyle = 'rgba(229,231,235,0.75)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.id, g.x, g.y + 24);
  }
}

function drawPlayer(ctx, state) {
  const p = state.player;
  ctx.save();
  ctx.globalAlpha = p.sneak ? 0.85 : 1;
  ctx.fillStyle = COLORS.playerDark;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ccfbf1';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.dir) * 14, p.y + Math.sin(p.dir) * 14);
  ctx.stroke();
  ctx.restore();
  if (p.sneak) {
    ctx.fillStyle = 'rgba(45, 212, 191, 0.8)';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SNEAK', p.x, p.y - 18);
  }
  if (p.lockpick > 0) {
    ctx.fillStyle = '#111827';
    ctx.fillRect(p.x - 22, p.y - 30, 44, 7);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(p.x - 21, p.y - 29, 42 * p.lockpick, 5);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LOCKPICK', p.x, p.y - 34);
  }
  if (state.diamondTaken) {
    ctx.fillStyle = COLORS.diamond;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('◆', p.x, p.y - 18);
  }
}

function drawCoins(ctx, state) {
  for (const c of state.coins) {
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 211, 77, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 11 + 3 * Math.sin(state.time * 5), 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawHud(ctx, state) {
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, FIELD_H, VIEW_W, VIEW_H - FIELD_H);
  ctx.fillStyle = COLORS.hudLine;
  ctx.fillRect(0, FIELD_H, VIEW_W, 2);

  const y = FIELD_H + 40;
  // Alarm meter.
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', 20, y - 12);
  ctx.fillStyle = COLORS.alarmBg;
  ctx.fillRect(20, y - 6, 260, 16);
  const alarmW = 260 * Math.min(1, state.alarm / 100);
  ctx.fillStyle = state.spotted >= 1 ? (Math.sin(state.time * 10) > 0 ? COLORS.alarm : '#fca5a5') : COLORS.alarm;
  ctx.fillRect(20, y - 6, alarmW, 16);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`${Math.floor(state.alarm)}%`, 288, y + 6);

  // Score / loot / time.
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`SCORE ${state.score}`, 360, y + 2);
  const lootGot = state.loot.filter((l) => l.taken).length;
  ctx.fillText(`LOOT ${lootGot}/4  $${state.lootValue}`, 500, y + 2);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '13px sans-serif';
  ctx.fillText(`TIME ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')}`, 660, y + 2);
  ctx.fillStyle = state.diamondTaken ? COLORS.diamond : COLORS.dim;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(state.diamondTaken ? '◆ DIAMOND — RUN!' : '◇ diamond in the vault', 780, y + 2);

  // Tool slots.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.dim;
  ctx.font = '12px sans-serif';
  ctx.fillText('[1] Coin −25   [2] Smoke −50   [3] EMP −75   [E] Lockpick   [Shift] Sneak', VIEW_W - 20, y - 14);
  ctx.fillText('Click: toss coin    R: restart    WASD / arrows: move', VIEW_W - 20, y + 8);

  // Toast message — top centre, clear of the GETAWAY doors and the HUD.
  if (state.messageT > 0) {
    ctx.fillStyle = 'rgba(11, 14, 26, 0.85)';
    const w = ctx.measureText(state.message).width + 28;
    ctx.fillRect((VIEW_W - w) / 2, 56, w, 26);
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.message, VIEW_W / 2, 74);
  }

  // SPOTTED banner.
  if (state.spotted >= 1 && state.screen === 'play') {
    ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
    ctx.fillRect(VIEW_W / 2 - 90, 12, 180, 30);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('! SPOTTED !', VIEW_W / 2, 33);
  }
}

function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(5, 8, 18, 0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('THE MERIDIAN VAULT', VIEW_W / 2, 250);
  ctx.fillStyle = COLORS.text;
  ctx.font = '20px Georgia, serif';
  ctx.fillText('A top-down stealth heist — steal the Meridian Diamond and get out clean.', VIEW_W / 2, 295);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '16px sans-serif';
  ctx.fillText('Guards patrol with vision cones. Cameras sweep the rooms. The alarm climbs while you are seen.', VIEW_W / 2, 350);
  ctx.fillText('Sneak (Shift), crawl the vents, toss coins to distract, smoke the cones, EMP the cameras.', VIEW_W / 2, 378);
  ctx.fillText('Hold E at the diamond pedestal to lockpick it. Grab the loot, then run for the GETAWAY doors.', VIEW_W / 2, 406);
  ctx.fillStyle = COLORS.good;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Press ENTER to begin the heist', VIEW_W / 2, 480);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '14px sans-serif';
  ctx.fillText('WASD / arrows move · Shift sneak · Click tosses a coin · 1 coin · 2 smoke · 3 EMP · E interact · R restart', VIEW_W / 2, 530);
}

function drawCaught(ctx, state) {
  ctx.fillStyle = 'rgba(69, 10, 10, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fca5a5';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('CAUGHT!', VIEW_W / 2, 300);
  ctx.fillStyle = COLORS.text;
  ctx.font = '20px sans-serif';
  ctx.fillText(state.caughtReason || 'The crew got made.', VIEW_W / 2, 350);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '16px sans-serif';
  ctx.fillText(`Score ${state.score} · Loot $${state.lootValue} · Time ${Math.floor(state.time)}s`, VIEW_W / 2, 390);
  ctx.fillStyle = COLORS.good;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Press R to try again', VIEW_W / 2, 450);
}

function drawWin(ctx, state) {
  const s = state.winStats || { loot: 0, timeBonus: 0, toolSpend: 0, total: 0, time: 0 };
  ctx.fillStyle = 'rgba(6, 32, 20, 0.85)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 60px Georgia, serif';
  ctx.fillText('CLEAN GETAWAY!', VIEW_W / 2, 260);
  ctx.fillStyle = COLORS.text;
  ctx.font = '20px sans-serif';
  ctx.fillText('The Meridian Diamond is out of the building. The crew vanishes into the night.', VIEW_W / 2, 305);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '18px sans-serif';
  ctx.fillText(`Loot  $${s.loot}`, VIEW_W / 2, 370);
  ctx.fillText(`Time bonus  +$${s.timeBonus}`, VIEW_W / 2, 400);
  ctx.fillText(`Tools spent  −$${s.toolSpend}`, VIEW_W / 2, 430);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`FINAL SCORE  ${s.total}`, VIEW_W / 2, 480);
  ctx.fillStyle = COLORS.good;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Press R to run it again', VIEW_W / 2, 540);
}

export function render(state) {
  const ctx = state.ctx;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx);
  drawExit(ctx, state.time);
  drawLoot(ctx, state);
  drawCrates(ctx);
  drawSmoke(ctx, state);
  drawCones(ctx, state);
  drawCameras(ctx, state);
  drawGuards(ctx, state);
  drawCoins(ctx, state);
  drawPlayer(ctx, state);
  drawHud(ctx, state);
  if (state.screen === 'title') drawTitle(ctx, state);
  else if (state.screen === 'caught') drawCaught(ctx, state);
  else if (state.screen === 'win') drawWin(ctx, state);
}
