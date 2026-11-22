// render.js — every pixel of NOCTURNE is drawn here in code: no image assets.
// Art direction: midnight-blue marble, warm gold light, turquoise surveillance,
// red alarm. Safe cover reads as solid and dark; danger reads as light cones.

import { CANVAS_W, CANVAS_H, PALETTE } from './config.js';
import { WALLS, OBSTACLES, FRAMES, ARTIFACT, EXITS, VENT } from './level.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function star(ctx, cx, cy, spikes, outer, inner, rot) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (i * Math.PI) / spikes;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

const SCONCES = [
  { x: 200, y: 36 }, { x: 480, y: 36 }, { x: 820, y: 36 },
  { x: 200, y: 684 }, { x: 480, y: 684 }, { x: 820, y: 684 },
  { x: 36, y: 360 }, { x: 1244, y: 360 },
];

export function drawGame(ctx, game) {
  const t = game.now;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawFloor(ctx, game);
  drawVent(ctx);
  drawFrames(ctx);
  drawExits(ctx, game);
  drawObstacles(ctx, game, t);
  drawRopes(ctx);
  drawSconces(ctx);
  drawCones(ctx, game);
  drawSmokes(ctx, game);
  drawDecoys(ctx, game);
  drawPickups(ctx, game, t);
  drawArtifact(ctx, game, t);
  drawCameras(ctx, game);
  drawGuards(ctx, game, t);
  drawPlayer(ctx, game, t);
  drawAlarmTint(ctx, game, t);
  drawHUD(ctx, game);
  if (game.phase === 'title') drawTitle(ctx, game, t);
  if (game.phase === 'paused') drawPaused(ctx, game);
  if (game.phase === 'won') drawWon(ctx, game);
  if (game.phase === 'lost') drawLost(ctx, game);
}

function drawFloor(ctx, game) {
  // Large low-contrast marble slabs (320x180), not a chessboard: the floor
  // should read as one polished surface, not a grid of tiles.
  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(tx * 320, ty * 180, 320, 180);
      // faint vein in each slab
      ctx.strokeStyle = 'rgba(232,179,75,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx * 320 + 40, ty * 180 + 20);
      ctx.quadraticCurveTo(tx * 320 + 160, ty * 180 + 90, tx * 320 + 280, ty * 180 + 150);
      ctx.stroke();
    }
  }
  // warm light pools: the gallery, the vault approach, the lobby
  for (const [lx, ly, lr] of [[640, 380, 260], [1050, 200, 180], [200, 600, 170]]) {
    const pool = ctx.createRadialGradient(lx, ly, 10, lx, ly, lr);
    pool.addColorStop(0, 'rgba(232,179,75,0.10)');
    pool.addColorStop(1, 'rgba(232,179,75,0)');
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.arc(lx, ly, lr, 0, Math.PI * 2);
    ctx.fill();
  }
  // polished sheen: a soft diagonal gold wash
  const sheen = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
  sheen.addColorStop(0, 'rgba(232,179,75,0.06)');
  sheen.addColorStop(0.5, 'rgba(232,179,75,0.0)');
  sheen.addColorStop(1, 'rgba(53,224,210,0.04)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  // centre medallion under the statue
  ctx.strokeStyle = 'rgba(232,179,75,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(650, 410, 92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(650, 410, 78, 0, Math.PI * 2);
  ctx.stroke();
  // walls
  for (const w of WALLS) {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(w.x, w.y, w.w, 3);
    ctx.strokeStyle = 'rgba(232,179,75,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.w - 1, w.h - 1);
  }
}

function drawVent(ctx) {
  ctx.fillStyle = '#05070F';
  ctx.fillRect(VENT.x, VENT.y, VENT.w, VENT.h);
  ctx.strokeStyle = 'rgba(53,224,210,0.35)';
  ctx.lineWidth = 1;
  for (let x = VENT.x + 12; x < VENT.x + VENT.w; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, VENT.y + 6);
    ctx.lineTo(x, VENT.y + VENT.h - 6);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(53,224,210,0.75)';
  ctx.font = '600 10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('VENT — CROUCH TO ENTER', VENT.x + 300, VENT.y + VENT.h - 8);
}

function drawFrames(ctx) {
  for (const f of FRAMES) {
    // Gilded frame with a small painted landscape inside, not a flat colour:
    // sky, a sun or moon, and a hill line, so it reads as a painting.
    ctx.fillStyle = '#0A0E22';
    ctx.fillRect(f.x - 6, f.y - 6, f.w + 12, f.h + 12);
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.strokeRect(f.x - 6, f.y - 6, f.w + 12, f.h + 12);
    const sky = ctx.createLinearGradient(f.x, f.y, f.x, f.y + f.h);
    sky.addColorStop(0, '#1B2A52');
    sky.addColorStop(1, f.hue);
    ctx.fillStyle = sky;
    ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.fillStyle = 'rgba(242,234,216,0.85)';
    ctx.beginPath();
    ctx.arc(f.x + f.w * 0.68, f.y + f.h * 0.3, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(7,11,26,0.55)';
    ctx.beginPath();
    ctx.moveTo(f.x, f.y + f.h);
    ctx.quadraticCurveTo(f.x + f.w * 0.5, f.y + f.h * 0.45, f.x + f.w, f.y + f.h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.moveTo(f.x, f.y + f.h);
    ctx.lineTo(f.x + f.w * 0.5, f.y);
    ctx.lineTo(f.x + f.w, f.y + f.h);
    ctx.closePath();
    ctx.fill();
  }
}

function drawExits(ctx, game) {
  for (const e of EXITS) {
    const held = game.player.hasArtifact;
    ctx.fillStyle = held ? 'rgba(53,224,210,0.28)' : 'rgba(53,224,210,0.10)';
    ctx.fillRect(e.x - 6, e.y - 6, e.w + 12, e.h + 12);
    ctx.fillStyle = PALETTE.turquoise;
    ctx.font = '700 11px system-ui, sans-serif';
    const label = held ? `EXIT — ${e.name.toUpperCase()}` : 'EXIT';
    if (e.y < 100) {
      ctx.textAlign = 'left';
      ctx.fillText(label, e.x, e.y + 34);
    } else {
      ctx.textAlign = 'center';
      ctx.fillText(label, e.x + e.w / 2, e.y - 26);
    }
    ctx.strokeStyle = PALETTE.turquoise;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(e.x - 6, e.y - 6, e.w + 12, e.h + 12);
  }
}

function drawObstacles(ctx, game, t) {
  for (const o of OBSTACLES) {
    if (o.kind === 'case' || o.kind === 'artifact-case') {
      const hot = o.kind === 'artifact-case';
      // plinth
      ctx.fillStyle = '#0D1226';
      ctx.fillRect(o.x, o.y + o.h - 10, o.w, 10);
      // glass body
      ctx.fillStyle = PALETTE.glass;
      ctx.fillRect(o.x, o.y, o.w, o.h - 8);
      ctx.strokeStyle = hot ? PALETTE.gold : 'rgba(201,162,39,0.65)';
      ctx.lineWidth = hot ? 2.5 : 1.5;
      ctx.strokeRect(o.x, o.y, o.w, o.h - 8);
      // glint
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.moveTo(o.x + 8, o.y + o.h - 8);
      ctx.lineTo(o.x + o.w * 0.45, o.y);
      ctx.lineTo(o.x + o.w * 0.62, o.y);
      ctx.lineTo(o.x + 26, o.y + o.h - 8);
      ctx.closePath();
      ctx.fill();
      // small exhibit inside
      ctx.fillStyle = hot ? 'rgba(232,179,75,0.9)' : 'rgba(178,120,60,0.85)';
      ctx.beginPath();
      ctx.arc(o.x + o.w / 2, o.y + o.h / 2 - 4, hot ? 9 : 6, 0, Math.PI * 2);
      ctx.fill();
      if (hot && !game.player.hasArtifact) {
        ctx.save();
        ctx.shadowColor = PALETTE.gold;
        ctx.shadowBlur = 18 + 8 * Math.sin(t * 2.4);
        ctx.fillStyle = PALETTE.gold;
        ctx.beginPath();
        ctx.arc(o.x + o.w / 2, o.y + o.h / 2 - 4, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (o.kind === 'pillar') {
      ctx.fillStyle = '#1E2748';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = PALETTE.goldDim;
      ctx.fillRect(o.x, o.y, o.w, 5);
      ctx.fillRect(o.x, o.y + o.h - 5, o.w, 5);
      ctx.strokeStyle = 'rgba(232,179,75,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1);
    } else if (o.kind === 'statue') {
      ctx.fillStyle = '#232C4E';
      rr(ctx, o.x, o.y, o.w, o.h, 6);
      ctx.fill();
      ctx.strokeStyle = PALETTE.goldDim;
      ctx.lineWidth = 1.5;
      rr(ctx, o.x, o.y, o.w, o.h, 6);
      ctx.stroke();
      // "The Dancer": a graceful figure, one arm raised, on a round base.
      ctx.fillStyle = '#C9B48A';
      ctx.beginPath();
      ctx.ellipse(o.x + o.w / 2, o.y + o.h - 10, 16, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#C9B48A';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(o.x + o.w / 2, o.y + o.h - 12);
      ctx.quadraticCurveTo(o.x + o.w / 2 - 6, o.y + 38, o.x + o.w / 2 + 2, o.y + 20);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(o.x + o.w / 2 + 2, o.y + 13, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(o.x + o.w / 2 - 2, o.y + 28);
      ctx.quadraticCurveTo(o.x + o.w / 2 - 22, o.y + 16, o.x + o.w / 2 - 26, o.y + 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(o.x + o.w / 2 + 4, o.y + 30);
      ctx.quadraticCurveTo(o.x + o.w / 2 + 20, o.y + 40, o.x + o.w / 2 + 24, o.y + 52);
      ctx.stroke();
    } else if (o.kind === 'bench') {
      ctx.fillStyle = '#4A3220';
      rr(ctx, o.x, o.y, o.w, o.h, 4);
      ctx.fill();
      ctx.fillStyle = '#6B4A2E';
      rr(ctx, o.x, o.y, o.w, 8, 4);
      ctx.fill();
    }
  }
}

function drawRopes(ctx) {
  // velvet ropes around the statue
  ctx.strokeStyle = PALETTE.velvet;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  const posts = [[540, 330], [760, 330], [540, 490], [760, 490]];
  ctx.beginPath();
  ctx.moveTo(posts[0][0], posts[0][1]);
  ctx.quadraticCurveTo(650, 356, posts[1][0], posts[1][1]);
  ctx.moveTo(posts[2][0], posts[2][1]);
  ctx.quadraticCurveTo(650, 466, posts[3][0], posts[3][1]);
  ctx.stroke();
  ctx.fillStyle = PALETTE.gold;
  for (const [x, y] of posts) {
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSconces(ctx) {
  for (const s of SCONCES) {
    const g = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, 90);
    g.addColorStop(0, 'rgba(232,179,75,0.20)');
    g.addColorStop(1, 'rgba(232,179,75,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function coneFill(ctx, poly, color, maxAlpha) {
  if (poly.length < 3) return;
  const [ox, oy] = poly[0];
  const grad = ctx.createRadialGradient(ox, oy, 10, ox, oy, 260);
  grad.addColorStop(0, color.replace('A', String(maxAlpha)));
  grad.addColorStop(1, color.replace('A', '0.03'));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
  ctx.closePath();
  ctx.fill();
}

function drawCones(ctx, game) {
  for (const g of game.guards) {
    const poly = g.cone(game.segments);
    const color =
      g.state === 'chase' ? 'rgba(255,59,78,A)' :
      g.state === 'suspicious' || g.state === 'investigate' || g.state === 'search' ? 'rgba(255,159,90,A)' :
      'rgba(232,179,75,A)';
    coneFill(ctx, poly, color, g.state === 'chase' ? 0.44 : 0.3);
    // faint edge so the cone reads even on dark floor
    ctx.strokeStyle = color.replace('A', g.state === 'chase' ? '0.5' : '0.3');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
    ctx.closePath();
    ctx.stroke();
  }
  for (const c of game.cameras) {
    if (c.disabled) continue;
    const poly = c.cone(game.segments);
    coneFill(ctx, poly, 'rgba(53,224,210,A)', c.spotting ? 0.42 : 0.26);
    ctx.strokeStyle = 'rgba(53,224,210,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
    ctx.closePath();
    ctx.stroke();
  }
}

function drawSmokes(ctx, game) {
  for (const s of game.smokes) {
    const g = ctx.createRadialGradient(s.x, s.y, 8, s.x, s.y, s.radius);
    g.addColorStop(0, 'rgba(200,210,230,0.6)');
    g.addColorStop(1, 'rgba(200,210,230,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fill();
    // inner swirls so the cloud reads as smoke, not a flat blob
    ctx.fillStyle = 'rgba(220,228,245,0.35)';
    for (const [dx, dy, r] of [[-28, -12, 16], [18, -22, 13], [26, 14, 15], [-14, 22, 12]]) {
      ctx.beginPath();
      ctx.arc(s.x + dx, s.y + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawDecoys(ctx, game) {
  for (const d of game.decoys) {
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(d.x, d.y, 14 + 6 * Math.sin(game.now * 10), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(d.x, d.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPickups(ctx, game, t) {
  for (const pk of game.pickups) {
    if (pk.taken) continue;
    const bob = Math.sin(t * 3 + pk.x) * 3;
    ctx.save();
    ctx.shadowColor = PALETTE.turquoise;
    ctx.shadowBlur = 10;
    ctx.fillStyle = PALETTE.turquoise;
    ctx.beginPath();
    ctx.arc(pk.x, pk.y + bob, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = PALETTE.cream;
    ctx.font = '700 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pk.kind === 'smoke' ? 'SMOKE' : 'DECOY', pk.x, pk.y + bob + 20);
  }
}

function drawArtifact(ctx, game, t) {
  if (game.player.hasArtifact) return;
  const { x, y } = ARTIFACT;
  const pulse = 1 + 0.08 * Math.sin(t * 2.4);
  ctx.save();
  ctx.shadowColor = '#FFD97A';
  ctx.shadowBlur = 26;
  ctx.fillStyle = '#FFE9A8';
  star(ctx, x, y, 4, 20 * pulse, 8 * pulse, t * 0.4);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#FFF6D8';
  star(ctx, x, y, 4, 11 * pulse, 4.5 * pulse, t * 0.4);
  ctx.fill();
  // label
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THE GLASS STAR', x, y - 34);
  // channel progress ring (drawn outside the case so it reads at a glance)
  const p = game.player;
  if (p.channel > 0) {
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y, 46, -Math.PI / 2, -Math.PI / 2 + p.channel * Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.cream;
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText('LIFTING THE GLASS…', x, y + 64);
  }
}

function drawCameras(ctx, game) {
  for (const c of game.cameras) {
    ctx.fillStyle = '#1E2748';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.disabled ? '#5A6478' : PALETTE.turquoise;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.disabled ? '#8A93A8' : PALETTE.turquoise;
    ctx.font = '700 9px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(c.disabled ? `${c.name} OFFLINE` : c.name, c.x + 13, c.y + 3);
  }
}

function drawGuards(ctx, game, t) {
  for (const g of game.guards) {
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(g.x, g.y + 12, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // body
    ctx.fillStyle = '#20294A';
    rr(ctx, g.x - 11, g.y - 12, 22, 26, 7);
    ctx.fill();
    ctx.fillStyle = g.color;
    ctx.fillRect(g.x - 11, g.y + 2, 22, 3);
    // head + cap
    ctx.fillStyle = '#D9A986';
    ctx.beginPath();
    ctx.arc(g.x, g.y - 18, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#141B34';
    ctx.beginPath();
    ctx.arc(g.x, g.y - 20, 8, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = g.color;
    ctx.fillRect(g.x - 8, g.y - 21, 16, 3);
    // facing tick
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.facing) * 16, g.y + Math.sin(g.facing) * 16);
    ctx.stroke();
    // suspicion arc
    if (g.suspicion > 2) {
      ctx.strokeStyle = g.suspicion > 60 ? PALETTE.red : PALETTE.gold;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y - 30, 9, -Math.PI / 2, -Math.PI / 2 + (g.suspicion / 100) * Math.PI * 2);
      ctx.stroke();
    }
    // state mark
    if (g.state === 'chase') {
      ctx.fillStyle = PALETTE.red;
      ctx.font = '900 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 38);
    } else if (g.state === 'suspicious' || g.state === 'investigate' || g.state === 'search') {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = '900 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - 38);
    }
    // name
    ctx.fillStyle = 'rgba(242,234,216,0.75)';
    ctx.font = '600 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.name.toUpperCase(), g.x, g.y + 26);
  }
}

function drawPlayer(ctx, game, t) {
  const p = game.player;
  const bob = p.moving ? Math.sin(t * 10) * 1.5 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 13, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // crouch ring: the quiet zone
  if (p.crouch) {
    ctx.strokeStyle = 'rgba(45,225,194,0.35)';
    ctx.setLineDash([4, 5]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // cloak
  ctx.fillStyle = PALETTE.thiefDark;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - 14 + bob);
  ctx.quadraticCurveTo(p.x + 13, p.y - 2, p.x + 11, p.y + 13);
  ctx.lineTo(p.x - 11, p.y + 13);
  ctx.quadraticCurveTo(p.x - 13, p.y - 2, p.x, p.y - 14 + bob);
  ctx.closePath();
  ctx.fill();
  // gold sash
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x - 9, p.y + 2);
  ctx.lineTo(p.x + 9, p.y + 8);
  ctx.stroke();
  // head + hat
  ctx.fillStyle = '#E8C39A';
  ctx.beginPath();
  ctx.arc(p.x, p.y - 17 + bob, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0E5F55';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y - 21 + bob, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(p.x - 5, p.y - 28 + bob, 10, 7);
  // facing tick
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.facing) * 15, p.y + Math.sin(p.facing) * 15);
  ctx.stroke();
  // artifact carried
  if (p.hasArtifact) {
    ctx.save();
    ctx.shadowColor = '#FFD97A';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#FFE9A8';
    star(ctx, p.x + 14, p.y - 8, 4, 8, 3.5, t);
    ctx.fill();
    ctx.restore();
  }
  // label
  ctx.fillStyle = PALETTE.thief;
  ctx.font = '700 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(p.crouch ? 'YOU · SNEAKING' : 'YOU', p.x, p.y + 27);
}

function drawAlarmTint(ctx, game, t) {
  const a = game.alarm;
  if (a.state === 'ALERT' || a.state === 'LOCKDOWN') {
    const pulse = 0.10 + 0.05 * Math.sin(t * 5);
    const g = ctx.createRadialGradient(640, 360, 240, 640, 360, 760);
    g.addColorStop(0, 'rgba(255,59,78,0)');
    g.addColorStop(1, `rgba(255,59,78,${a.state === 'LOCKDOWN' ? pulse + 0.12 : pulse})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
  // red edge flash while any guard is chasing
  if (game.guards.some((g) => g.state === 'chase')) {
    const pulse = 0.08 + 0.05 * Math.sin(t * 7);
    ctx.strokeStyle = `rgba(255,59,78,${pulse + 0.25})`;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, CANVAS_W - 6, CANVAS_H - 6);
  }
}

function drawHUD(ctx, game) {
  const a = game.alarm;
  const p = game.player;
  // top bar
  ctx.fillStyle = 'rgba(7,11,26,0.86)';
  ctx.fillRect(0, 0, CANVAS_W, 46);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(0, 46, CANVAS_W, 1);
  // objective
  ctx.fillStyle = PALETTE.cream;
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('◆ ' + game.objective, 14, 20);
  ctx.fillStyle = 'rgba(242,234,216,0.6)';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText(game.phase === 'playing' ? 'NOCTURNE — THE GLASS ARCHIVE' : '', 14, 36);
  // alarm meter
  const bx = 500;
  const bw = 280;
  ctx.fillStyle = 'rgba(242,234,216,0.75)';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', bx, 18);
  ctx.fillStyle = '#1A2138';
  rr(ctx, bx, 24, bw, 12, 6);
  ctx.fill();
  const frac = a.level / 100;
  const col = a.state === 'LOCKDOWN' ? PALETTE.red : a.state === 'ALERT' ? '#FF7A45' : a.state === 'SUSPICIOUS' ? PALETTE.gold : PALETTE.turquoise;
  if (frac > 0) {
    ctx.fillStyle = col;
    rr(ctx, bx, 24, Math.max(12, bw * frac), 12, 6);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(242,234,216,0.4)';
  ctx.lineWidth = 1;
  rr(ctx, bx, 24, bw, 12, 6);
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText(a.state, bx + bw + 10, 35);
  // tools + timer + artifact
  const tx = 900;
  ctx.textAlign = 'left';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillStyle = p.tools.smoke > 0 ? PALETTE.cream : 'rgba(242,234,216,0.35)';
  ctx.fillText(`◐ SMOKE ×${p.tools.smoke} [1]`, tx, 20);
  ctx.fillStyle = p.tools.decoy > 0 ? PALETTE.cream : 'rgba(242,234,216,0.35)';
  ctx.fillText(`◉ DECOY ×${p.tools.decoy} [2]`, tx, 36);
  ctx.fillStyle = p.tools.emp > 0 ? PALETTE.cream : 'rgba(242,234,216,0.35)';
  ctx.fillText(`⚡ EMP ×${p.tools.emp} [3]`, tx + 150, 20);
  ctx.fillStyle = p.hasArtifact ? PALETTE.gold : 'rgba(242,234,216,0.4)';
  ctx.fillText(p.hasArtifact ? '★ GLASS STAR — HELD' : '☆ GLASS STAR', tx + 150, 36);
  ctx.fillStyle = PALETTE.cream;
  ctx.font = '700 13px system-ui, monospace';
  ctx.textAlign = 'right';
  ctx.fillText(fmtTime(game.elapsed), CANVAS_W - 14, 20);
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(242,234,216,0.6)';
  ctx.fillText('DETECTIONS ' + game.stats.detections, CANVAS_W - 14, 36);
  // controls hint
  ctx.fillStyle = 'rgba(242,234,216,0.55)';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('WASD move · Shift sneak · E lift the Glass Star · 1 smoke · 2 decoy (click to throw) · 3 EMP · Esc pause · M mute', 14, CANVAS_H - 12);
  // flash message
  if (game.flashText && game.now < game.flashUntil) {
    ctx.fillStyle = 'rgba(7,11,26,0.85)';
    const w = ctx.measureText(game.flashText).width + 28;
    rr(ctx, (CANVAS_W - w) / 2, 56, w, 26, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 1;
    rr(ctx, (CANVAS_W - w) / 2, 56, w, 26, 8);
    ctx.stroke();
    ctx.fillStyle = PALETTE.cream;
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.flashText, CANVAS_W / 2, 73);
  }
}

export function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(7,11,26,0.92)';
  rr(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  rr(ctx, x, y, w, h, 14);
  ctx.stroke();
}

function drawTitle(ctx, game, t) {
  ctx.fillStyle = 'rgba(4,6,15,0.55)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  panel(ctx, 290, 130, 700, 440);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '600 15px Georgia, serif';
  ctx.fillText('M A K E . F U N   P R E S E N T S', 640, 178);
  ctx.fillStyle = PALETTE.cream;
  ctx.font = '700 56px Georgia, serif';
  ctx.fillText('NOCTURNE', 640, 240);
  ctx.fillStyle = PALETTE.turquoise;
  ctx.font = '600 22px Georgia, serif';
  ctx.fillText('— THE GLASS ARCHIVE —', 640, 274);
  ctx.fillStyle = 'rgba(242,234,216,0.85)';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('One midnight. One museum. One impossible artifact.', 640, 308);
  ctx.fillText('Slip past four guards and two cameras. Lift the Glass Star.', 640, 330);
  ctx.fillText('Escape through any exit — unseen.', 640, 352);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText('WASD move   ·   Shift sneak   ·   E interact   ·   1 smoke   ·   2 decoy   ·   3 EMP   ·   Esc pause', 640, 396);
  ctx.fillStyle = 'rgba(242,234,216,0.7)';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('Crouch to slip through the vent shaft. Cameras can be silenced — once.', 640, 420);
  ctx.fillText('If the alarm hits LOCKDOWN, the archive seals itself.', 640, 440);
  const pulse = 0.6 + 0.4 * Math.sin(t * 3);
  ctx.fillStyle = `rgba(232,179,75,${pulse})`;
  ctx.font = '700 18px system-ui, sans-serif';
  ctx.fillText('PRESS ENTER OR CLICK TO BEGIN', 640, 500);
  ctx.fillStyle = 'rgba(242,234,216,0.5)';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('An original stealth game. All art drawn in code. No network needed.', 640, 540);
}

function drawPaused(ctx, game) {
  ctx.fillStyle = 'rgba(4,6,15,0.6)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  panel(ctx, 440, 250, 400, 190);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.cream;
  ctx.font = '700 34px Georgia, serif';
  ctx.fillText('PAUSED', 640, 310);
  ctx.fillStyle = 'rgba(242,234,216,0.8)';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('Esc to resume · R to restart the heist', 640, 348);
  ctx.fillText('M to mute sound', 640, 372);
}

function drawWon(ctx, game) {
  ctx.fillStyle = 'rgba(4,6,15,0.55)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  panel(ctx, 380, 150, 520, 400);
  const rank = game.rank;
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '600 15px Georgia, serif';
  ctx.fillText('THE HEIST IS COMPLETE', 640, 200);
  ctx.fillStyle = PALETTE.cream;
  ctx.font = '700 44px Georgia, serif';
  ctx.fillText('CLEAN GETAWAY', 640, 250);
  ctx.fillStyle = PALETTE.turquoise;
  ctx.font = '700 30px Georgia, serif';
  ctx.fillText(`RANK: ${rank.name}`, 640, 300);
  ctx.fillStyle = 'rgba(242,234,216,0.85)';
  ctx.font = 'italic 15px Georgia, serif';
  ctx.fillText(rank.blurb, 640, 330);
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.cream;
  ctx.fillText(`Time ${fmtTime(game.elapsed)}  ·  Detections ${game.stats.detections}  ·  Alarm trips ${game.alarm.triggered}`, 640, 372);
  ctx.fillText(`Escaped via ${game.exitName}`, 640, 398);
  const pulse = 0.6 + 0.4 * Math.sin(game.now * 3);
  ctx.fillStyle = `rgba(232,179,75,${pulse})`;
  ctx.font = '700 16px system-ui, sans-serif';
  ctx.fillText('PRESS R TO RUN IT AGAIN', 640, 470);
}

function drawLost(ctx, game) {
  ctx.fillStyle = 'rgba(20,4,8,0.6)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  panel(ctx, 380, 180, 520, 330);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.red;
  ctx.font = '700 40px Georgia, serif';
  ctx.fillText('CAUGHT', 640, 250);
  ctx.fillStyle = PALETTE.cream;
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText(game.loseReason, 640, 292);
  ctx.fillStyle = 'rgba(242,234,216,0.75)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('The cones are honest: watch them sweep, move between beats,', 640, 326);
  ctx.fillText('crouch behind the cases, and spend a decoy before you cross open floor.', 640, 348);
  const pulse = 0.75 + 0.25 * Math.sin(game.now * 3);
  ctx.fillStyle = `rgba(232,179,75,${pulse})`;
  ctx.font = '700 18px system-ui, sans-serif';
  ctx.fillText('PRESS R TO TRY AGAIN', 640, 420);
}
