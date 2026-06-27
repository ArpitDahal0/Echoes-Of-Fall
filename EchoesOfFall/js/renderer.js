// renderer.js
// draws everything — background, platforms, player, effects, hud
// - Bibek

let canvas, ctx;
let W, H;
let cameraY = 0;
let particles = [];
let floatingTexts = [];
let shake = { active: false, start: 0, duration: 400, amount: 12 };
let deathFlash = 0;

let menuParticles = [];
let dust = [];
let buildings = [];
let windows = [];
let carStreaks = [
  { y: 0, x: -200, speed: 1.2 },
  { y: 0, x: -400, speed: 0.9 },
  { y: 0, x: -100, speed: 1.5 },
];
let clouds = [];

let trailHistory = [];

const NPCS = Array.from({ length: 10 }, (_, i) => ({
  x: 80 + i * 140,
  baseY: 2870,
  bobOffset: Math.random() * Math.PI * 2,
  color: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF8B94'][i % 5],
  sign: null,
  bubble: null,
  bubbleTimer: 0,
}));

// ── LIGHT RAYS ───────────────────────────────────────────────

function drawLightRays(W, H) {
  ctx.save();
  ctx.globalAlpha = 0.035;
  ctx.fillStyle = '#FF8C00';
  ctx.translate(W / 2, H * 0.16);
  const angle = Date.now() * 0.00018;
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate(angle + i * (Math.PI / 3));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-55, 550);
    ctx.lineTo(55, 550);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1.0;
  ctx.restore(); // critical — was missing before
}

// ── NPC CROWD ────────────────────────────────────────────────

function updateNPCReactions(heightM, justDied) {
  NPCS.forEach((npc, i) => {
    if (justDied) {
      npc.sign = i === 3 ? 'L' : null;
      npc.bubble = ['oh no!', '😱', 'RIP', 'lol', 'F'][i % 5];
      npc.bubbleTimer = Date.now();
    } else if (heightM > 50 && Math.random() < 0.002) {
      npc.bubble = ['GO GO!', 'WOW!', '🔥', 'KING!', 'LETS GO'][Math.floor(Math.random() * 5)];
      npc.bubbleTimer = Date.now();
      npc.sign = null;
    } else if (heightM > 20 && Math.random() < 0.001) {
      npc.bubble = ['nice', 'keep going', '👀', 'almost!'][Math.floor(Math.random() * 4)];
      npc.bubbleTimer = Date.now();
    }
  });
}

function drawNPCCrowd() {
  NPCS.forEach(npc => {
    const screenY = npc.baseY - cameraY;
    if (screenY < -40 || screenY > H + 40) return;
    const bob = Math.sin(Date.now() / 400 + npc.bobOffset) * 2;

    ctx.fillStyle = npc.color;
    ctx.beginPath(); ctx.arc(npc.x, screenY - 14 + bob, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(npc.x - 4, screenY - 9 + bob, 8, 10);
    ctx.fillRect(npc.x - 4, screenY + 1 + bob, 3, 7);
    ctx.fillRect(npc.x + 1, screenY + 1 + bob, 3, 7);

    if (npc.sign) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(npc.sign, npc.x, screenY - 26 + bob);
    }

    if (npc.bubble && Date.now() - npc.bubbleTimer < 2500) {
      const alpha = 1 - (Date.now() - npc.bubbleTimer) / 2500;
      ctx.globalAlpha = alpha;
      ctx.font = '8px "Press Start 2P"';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(npc.bubble, npc.x, screenY - 32 + bob);
      ctx.globalAlpha = 1;
    }
  });
}

// ── TRAIL ────────────────────────────────────────────────────

function updateTrail(px, py, speed) {
  const trailType = lsGet('eof_trail', 'none');
  if (trailType === 'none' || Math.abs(speed) < 1) return;
  const trail = TRAIL_TYPES[trailType];
  if (!trail) return;
  trailHistory.push({
    x: px, y: py,
    color: trail.colors[Math.floor(Math.random() * trail.colors.length)],
    shape: trail.shape,
    alpha: 0.8,
    size: 4 + Math.random() * 3,
  });
  if (trailHistory.length > 25) trailHistory.shift();
}

function drawTrail() {
  trailHistory = trailHistory.filter(t => t.alpha > 0);
  trailHistory.forEach(t => {
    t.alpha -= 0.05;
    const screenY = t.y - cameraY;
    ctx.globalAlpha = t.alpha;
    ctx.fillStyle = t.color;
    if (t.shape === 'circle') {
      ctx.beginPath(); ctx.arc(t.x, screenY, t.size, 0, Math.PI * 2); ctx.fill();
    } else if (t.shape === 'diamond') {
      ctx.save(); ctx.translate(t.x, screenY); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-t.size / 2, -t.size / 2, t.size, t.size); ctx.restore();
    } else {
      ctx.beginPath(); ctx.arc(t.x, screenY, t.size * 0.7, 0, Math.PI * 2); ctx.fill();
    }
  });
  ctx.globalAlpha = 1;
}

// ── CHECKPOINT FLAGS ─────────────────────────────────────────

function drawCheckpointFlag(x, y, label, reached) {
  const screenY = y - cameraY;
  if (screenY < -60 || screenY > H + 60) return;

  ctx.strokeStyle = reached ? '#FFD700' : '#888';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, screenY); ctx.lineTo(x, screenY - 45); ctx.stroke();

  const wave = Math.sin(Date.now() / 300) * 4;
  ctx.fillStyle = reached ? '#FF4444' : '#555';
  ctx.beginPath();
  ctx.moveTo(x, screenY - 45);
  ctx.quadraticCurveTo(x + 15, screenY - 38 + wave, x + 28, screenY - 32);
  ctx.quadraticCurveTo(x + 15, screenY - 26 + wave, x, screenY - 20);
  ctx.closePath();
  ctx.fill();

  if (reached) {
    ctx.fillStyle = '#003893';
    ctx.beginPath();
    ctx.moveTo(x, screenY - 45);
    ctx.quadraticCurveTo(x + 8, screenY - 40 + wave, x + 16, screenY - 36);
    ctx.quadraticCurveTo(x + 8, screenY - 32 + wave, x, screenY - 28);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 15;
    ctx.fillStyle = 'rgba(255,215,0,0.15)';
    ctx.beginPath(); ctx.arc(x, screenY - 30, 22, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.font = '8px "Press Start 2P"';
  ctx.fillStyle = reached ? '#FFD700' : '#888';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 34, screenY - 32);
}

// ── PLAYER DRAWING ───────────────────────────────────────────

function drawPlayerPose(c, skin, pose) {
  const skinColor = '#D4956A';
  const gi = skin.body;
  const runPhase = Math.sin(Date.now() / 120);

  c.fillStyle = gi;
  if (pose === 'land') c.fillRect(-8, -2, 16, 10);
  else c.fillRect(-5, -8, 10, 16);

  c.fillStyle = skin.belt;
  c.fillRect(-5, 2, 10, 2);

  c.fillStyle = skinColor;
  c.beginPath();
  if (pose === 'land') c.arc(0, 2, 7, 0, Math.PI * 2);
  else c.arc(0, -14, 7, 0, Math.PI * 2);
  c.fill();

  c.strokeStyle = skin.accent;
  c.lineWidth = 5;
  c.lineCap = 'round';

  if (pose === 'run') {
    c.beginPath(); c.moveTo(-5, -2); c.lineTo(-12 + runPhase * 4, 2); c.stroke();
    c.beginPath(); c.moveTo(5, -2); c.lineTo(12 - runPhase * 4, -2); c.stroke();
    c.beginPath(); c.moveTo(-3, 8); c.lineTo(-3 + runPhase * 6, 16); c.stroke();
    c.beginPath(); c.moveTo(3, 8); c.lineTo(3 - runPhase * 6, 16); c.stroke();
  } else if (pose === 'jump_up') {
    c.beginPath(); c.moveTo(0, -6); c.lineTo(0, -18); c.stroke();
    c.beginPath(); c.moveTo(-3, 8); c.lineTo(-8, 16); c.stroke();
    c.beginPath(); c.moveTo(3, 8); c.lineTo(6, 12); c.stroke();
  } else if (pose === 'fall_down' || pose === 'death_spin') {
    c.beginPath(); c.moveTo(-5, -6); c.lineTo(-16, -12); c.stroke();
    c.beginPath(); c.moveTo(5, -6); c.lineTo(16, -12); c.stroke();
    c.beginPath(); c.moveTo(-3, 8); c.lineTo(-6, 18); c.stroke();
    c.beginPath(); c.moveTo(3, 8); c.lineTo(6, 18); c.stroke();
  } else {
    // idle / land
    c.beginPath(); c.moveTo(-5, -4); c.lineTo(-10, 0); c.stroke();
    c.beginPath(); c.moveTo(5, -4); c.lineTo(10, 0); c.stroke();
    c.beginPath(); c.moveTo(-3, 8); c.lineTo(-5, 14); c.stroke();
    c.beginPath(); c.moveTo(3, 8); c.lineTo(5, 14); c.stroke();
  }
}

// ── WEATHER ──────────────────────────────────────────────────

function drawWeatherEffects() {
  const w = window._weather || WEATHERS[0];

  if (w.id === 'fog') {
    // subtle edge mist only — NOT a black hole
    const fogGrad = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.78);
    fogGrad.addColorStop(0, 'rgba(200,210,220,0)');
    fogGrad.addColorStop(1, 'rgba(200,210,220,0.52)');
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, 0, W, H);
    ctx.font = '9px "Press Start 2P"';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.textAlign = 'right';
    ctx.fillText('🌫️ FOG', W - 16, H - 36);
  }

  if (w.id === 'rain') {
    if (!window._raindrops) {
      window._raindrops = Array.from({ length: 80 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        speed: 8 + Math.random() * 4, len: 12 + Math.random() * 8,
      }));
    }
    ctx.strokeStyle = 'rgba(150,200,255,0.35)'; ctx.lineWidth = 1;
    window._raindrops.forEach(r => {
      r.y += r.speed; r.x -= 1;
      if (r.y > H) { r.y = -20; r.x = Math.random() * W; }
      ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - 2, r.y + r.len); ctx.stroke();
    });
  }

  if (w.id === 'wind') {
    if (!window._windLines) {
      window._windLines = Array.from({ length: 20 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        speed: 4 + Math.random() * 3, len: 30 + Math.random() * 40,
        alpha: Math.random() * 0.3,
      }));
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
    window._windLines.forEach(wl => {
      wl.x += wl.speed;
      if (wl.x > W + 60) wl.x = -60;
      ctx.globalAlpha = wl.alpha;
      ctx.beginPath(); ctx.moveTo(wl.x, wl.y); ctx.lineTo(wl.x - wl.len, wl.y); ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }
}

// ── RENDERER INIT ────────────────────────────────────────────

function initRenderer() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;

  for (let i = 0; i < 40; i++) {
    dust.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.15 - Math.random() * 0.25,
    });
  }

  for (let i = 0; i < 5; i++) {
    clouds.push({
      x: Math.random() * W,
      y: 200 + Math.random() * 400,
      w: 80 + Math.random() * 60,
      h: 20 + Math.random() * 15,
    });
  }

  initCityscapeFallback();
  initMenuParticles();

  window.addEventListener('resize', () => {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    initCityscapeFallback();
    if (typeof spawnX !== 'undefined') spawnX = W / 2;
  });
}

function initMenuParticles() {
  menuParticles = [];
  for (let i = 0; i < 40; i++) {
    menuParticles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vy: -(Math.random() * 0.5 + 0.2),
      vx: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1,
      r: Math.random() * 1.5 + 0.5,
    });
  }
}

function initCityscapeFallback() {
  buildings.length = 0;
  windows.length = 0;
  let x = -20;
  while (x < W + 40) {
    const bw = 40 + Math.random() * 80;
    const bh = 80 + Math.random() * 180;
    buildings.push({ x, w: bw, h: bh });
    const rows = Math.floor(bh / 18);
    const cols = Math.floor(bw / 14);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() > 0.35) {
          windows.push({
            x: x + 6 + c * 14,
            y: H - bh + 8 + r * 18,
            w: 8, h: 10,
            on: Math.random() > 0.5,
            timer: 0.4 + Math.random() * 1.8,
            elapsed: Math.random() * 2,
          });
        }
      }
    }
    x += bw + 4 + Math.random() * 10;
  }
  carStreaks.forEach((c, i) => {
    c.y = H - 28 + i * 6;
    c.x = -200 - i * 150;
  });
}

// ── HELPERS ──────────────────────────────────────────────────

function triggerShake() {
  shake.active = true;
  shake.start = Date.now();
}

function spawnDust(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * 2 + 1;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, alpha: 0.6, color, r: Math.random() * 3 + 1 });
  }
}

function spawnFloatingText(text, x, y, color) {
  floatingTexts.push({ text, x, y, vy: -1.2, alpha: 1.0, color });
}

function applyShake() {
  if (!shake.active) return;
  const t = 1 - (Date.now() - shake.start) / shake.duration;
  if (t <= 0) { shake.active = false; return; }
  ctx.translate((Math.random() - 0.5) * shake.amount * t, (Math.random() - 0.5) * shake.amount * t);
}

// ── PARALLAX BACKGROUND ──────────────────────────────────────

function drawParallax(camY) {
  const rates = [0.05, 0.1, 0.2, 0.35, 0.5];
  const layerH = H * 1.5;

  ctx.save();
  ctx.translate(0, -camY * rates[0]);
  const skyGrad = ctx.createLinearGradient(0, 0, 0, layerH);
  skyGrad.addColorStop(0, '#6ba89e');
  skyGrad.addColorStop(1, '#c2dbd5');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(-50, -200, W + 100, layerH + 400);
  ctx.restore();

  ctx.save();
  ctx.translate(0, -camY * rates[1]);
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#7a9e8a';
  for (let i = 0; i < 7; i++) {
    const mx = i * W / 6 - 50;
    const my = 400 + i * 30;
    ctx.beginPath();
    ctx.moveTo(mx, my + 120);
    ctx.quadraticCurveTo(mx + 80, my - 40, mx + 160, my + 120);
    ctx.quadraticCurveTo(mx + 240, my + 20, mx + 320, my + 120);
    ctx.lineTo(mx - 20, my + 120);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.save();
  ctx.translate(0, -camY * rates[2]);
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#4a7a60';
  for (let i = 0; i < 5; i++) {
    const hx = i * W / 4 - 30;
    const hy = 600 + i * 20;
    ctx.beginPath();
    ctx.moveTo(hx, hy + 80);
    ctx.quadraticCurveTo(hx + 60, hy, hx + 130, hy + 80);
    ctx.quadraticCurveTo(hx + 200, hy + 30, hx + 260, hy + 80);
    ctx.lineTo(hx - 10, hy + 80);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.save();
  ctx.translate(0, -camY * rates[3]);
  ctx.fillStyle = '#1a2a1a';
  const treeBase = 2700;
  for (let i = 0; i < 3; i++) {
    const tx = W * 0.2 + i * W * 0.3;
    const ty = treeBase;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - 18, ty - 60); ctx.lineTo(tx - 8, ty - 55);
    ctx.lineTo(tx - 22, ty - 100); ctx.lineTo(tx, ty - 85);
    ctx.lineTo(tx + 22, ty - 100); ctx.lineTo(tx + 8, ty - 55);
    ctx.lineTo(tx + 18, ty - 60);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(tx - 4, ty - 10, 8, 20);
  }
  ctx.restore();

  ctx.save();
  ctx.translate(0, -camY * rates[4]);
  drawStreetScene(2900);
  ctx.restore();
}

function drawStreetScene(baseY) {
  ctx.fillStyle = '#3a2a1a';
  for (let i = 0; i < 8; i++) {
    const bx = i * (W / 7) - 20;
    const bh = 60 + (i % 3) * 30;
    ctx.fillRect(bx, baseY - bh, W / 7 + 10, bh);
    ctx.fillStyle = '#FF9500';
    ctx.globalAlpha = 0.6;
    ctx.fillRect(bx + 10, baseY - bh + 15, 30, 8);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#3a2a1a';
  }
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, baseY + 10, W + 100, 30);
}

// ── PLATFORMS ────────────────────────────────────────────────

function drawBoulderPlatform(body) {
  if (body.broken) return;
  const verts = body.vertices;
  const id = body.platformId;
  const pts = verts.map((v, i) => ({
    x: v.x + seededOffset(id, i),
    y: v.y + seededOffset(id, i + 4),
  }));

  const minY = Math.min(...pts.map(p => p.y));
  const maxY = Math.max(...pts.map(p => p.y));

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, minY, 0, maxY);
  grad.addColorStop(0, '#c8a86b');
  grad.addColorStop(1, '#7a5530');
  ctx.fillStyle = grad;
  ctx.fill();

  if (body.platformType === 'breakable') {
    ctx.fillStyle = 'rgba(160,60,30,0.4)';
    ctx.fill();
  }

  if (body.platformType === 'moving') {
    ctx.fillStyle = 'rgba(200,160,80,0.15)';
    const cx = body.position.x;
    const cy = body.position.y;
    ctx.fillRect(cx - body.platformW / 2, cy - body.platformH / 2, body.platformW, body.platformH);
  }

  // spikes on platform
  const p = body.platformDef;
  if (p && p.spikes) {
    p.spikes.forEach(sp => {
      for (let s = 0; s < sp.count; s++) {
        const sx = body.position.x - p.w / 2 + sp.offset + s * 22;
        const sy = body.position.y - p.h / 2;
        ctx.fillStyle = '#CC3300';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 11, sy - 18);
        ctx.lineTo(sx + 22, sy);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#FF5500';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
  }
}

function drawSpringPad(body) {
  drawBoulderPlatform(body);
  const cx = body.position.x, cy = body.position.y - 4;
  ctx.strokeStyle = '#88FF44'; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy - 6 + i * 4);
    ctx.lineTo(cx + 20, cy - 6 + i * 4);
    ctx.stroke();
  }
}

function drawSpeedPad(body) {
  drawBoulderPlatform(body);
  const cx = body.position.x, cy = body.position.y;
  ctx.fillStyle = '#00FFDD';
  ctx.shadowColor = '#00FFDD'; ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy);
  ctx.lineTo(cx + 14, cy - 8);
  ctx.lineTo(cx + 14, cy + 8);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
}

function drawPortal(body) {
  const cx = body.position.x, cy = body.position.y;
  const pulse = 15 + Math.sin(Date.now() / 600) * 10;
  ctx.shadowColor = '#FFB700'; ctx.shadowBlur = pulse;
  ctx.fillStyle = '#FFB700';
  ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
}

// ── PLAYER ───────────────────────────────────────────────────

function drawPlayerCharacter() {
  if (!player) return;
  const px = player.position.x;
  const py = player.position.y;
  const skin = typeof currentSkin !== 'undefined' ? currentSkin : SKINS[0];
  const pose = currentPose || 'idle';

  ctx.save();
  ctx.translate(px, py);
  if (!facingRight) ctx.scale(-1, 1);

  if (pose === 'death_spin') {
    ctx.rotate(((Date.now() - deathSpinStart) / 380) * Math.PI * 2);
  } else if (pose === 'run') {
    ctx.rotate(0.18);
  } else if (pose === 'jump_up') {
    ctx.rotate(0.12);
  }

  drawPlayerPose(ctx, skin, pose);
  ctx.restore();
}

// ── COINS & SPIKES ───────────────────────────────────────────

function drawCoin(coin) {
  if (coin.collected) return;
  coin.pulse = (coin.pulse || 0) + 0.05;
  const bob = Math.sin(coin.pulse) * 3;
  ctx.save();
  ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 12;
  ctx.fillStyle = '#FFD700';
  ctx.beginPath(); ctx.arc(coin.x, coin.y + bob, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#FF8C00'; ctx.lineWidth = 2; ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#3a2000';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('$', coin.x, coin.y + bob + 3);
  ctx.restore();
}

function drawSpike(spike) {
  const count = Math.floor(spike.w / 11);
  ctx.save();
  ctx.shadowColor = '#FF3300'; ctx.shadowBlur = 6;
  for (let i = 0; i < count; i++) {
    const sx = spike.x - spike.w / 2 + i * 11 + 5.5;
    ctx.fillStyle = '#AAAAAA';
    ctx.beginPath();
    ctx.moveTo(sx - 5, spike.y + 2);
    ctx.lineTo(sx, spike.y - 14);
    ctx.lineTo(sx + 5, spike.y + 2);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// ── GHOST ────────────────────────────────────────────────────

function drawGhostReplay() {
  if (!ghostPlayback.length || !gameStarted) return;
  ghostIdx = Math.min(ghostIdx + 1, ghostPlayback.length - 1);
  const gp = ghostPlayback[ghostIdx];
  if (!gp) return;
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.translate(gp.x, gp.y);
  ctx.fillStyle = '#00FFFF';
  ctx.beginPath(); ctx.arc(0, -14, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-5, -8, 10, 16);
  ctx.restore();
}

// ── PARTICLES & FLOATING TEXT ────────────────────────────────

function drawParticlesWorld() {
  particles = particles.filter(p => p.alpha > 0);
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.alpha -= 0.018;
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawFloatingTextsScreen() {
  floatingTexts = floatingTexts.filter(t => t.alpha > 0);
  floatingTexts.forEach(t => {
    t.y += t.vy; t.alpha -= 0.015;
    ctx.globalAlpha = t.alpha;
    ctx.font = 'bold 13px "Press Start 2P", monospace';
    ctx.fillStyle = t.color;
    ctx.textAlign = 'center';
    ctx.fillText(t.text, t.x, t.y);
  });
  ctx.globalAlpha = 1;
}

// ── DEATH EFFECTS ────────────────────────────────────────────

function drawDeathEffects() {
  if (deathFlash > 0) {
    ctx.fillStyle = 'rgba(255,0,0,' + (deathFlash * 0.4) + ')';
    ctx.fillRect(0, 0, W, H);
    deathFlash = Math.max(0, deathFlash - 0.03);
  }
}

function drawQuoteOverlay() {
  if (!quoteText || Date.now() > quoteUntil) return;
  const qy = H * 0.50; // center screen — never overlaps HUD
  ctx.font = '10px "Press Start 2P", monospace';
  const rawW = ctx.measureText('💀 ' + quoteText).width;
  const qw = Math.min(W * 0.82, rawW + 36);
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.beginPath();
  ctx.roundRect(W / 2 - qw / 2, qy - 20, qw, 34, 7);
  ctx.fill();
  ctx.fillStyle = '#FF5555';
  ctx.textAlign = 'center';
  ctx.fillText('💀 ' + quoteText, W / 2, qy + 4);
  if (currentTaunt) {
    ctx.font = '8px "Press Start 2P"';
    ctx.fillStyle = 'rgba(255,160,160,0.8)';
    ctx.fillText(currentTaunt, W / 2, qy + 26);
  }
}

// ── HUD ──────────────────────────────────────────────────────

function drawPill(x, y, text, color) {
  ctx.save();
  ctx.font = 'bold 9px "Press Start 2P", monospace';
  const w = Math.max(66, ctx.measureText(text).width + 16);
  const h = 19;
  ctx.fillStyle = 'rgba(10,5,20,0.78)';
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(192,132,252,0.4)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = color; ctx.textAlign = 'center';
  ctx.fillText(text, x, y + 4);
  ctx.restore();
}

function drawProgressBar() {
  if (!player) return;
  const progress = clamp((CONFIG.heightBase - player.position.y) / (CONFIG.heightBase - 250), 0, 1);
  const barX = W - 22, barY = 80, barH = H - 160, barW = 8;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.roundRect(barX - barW / 2, barY, barW, barH, 4); ctx.fill();
  const grad = ctx.createLinearGradient(0, barY + barH, 0, barY);
  grad.addColorStop(0, '#FF4444');
  grad.addColorStop(0.5, '#FFD700');
  grad.addColorStop(1, '#00FF88');
  ctx.fillStyle = grad;
  const fillH = barH * progress;
  if (fillH > 0) {
    ctx.beginPath(); ctx.roundRect(barX - barW / 2, barY + barH - fillH, barW, fillH, 4); ctx.fill();
  }
}

function drawHUD(ngPlusActive, prestigeLevel, name) {
  if (!player) return;
  const heightM = heightInMeters(player.position.y);
  const xpInfo = xpToNextLevel(xp);

  // top accent line
  ctx.fillStyle = '#c084fc';
  ctx.fillRect(0, 0, W, 2);

  // ROW 1 — Y = 24
  drawPill(88,     24, '▲ ' + heightM + 'm',  '#FFB700');
  drawPill(W / 2,  24, formatTime(elapsed),    '#ffffff');
  drawPill(W - 88, 24, '💀 ' + deaths,          '#FF4444');

  // ROW 2 — Y = 52 (28px below — no overlap)
  drawPill(88,     52, '⭐ LV.' + getLevel(xp), '#a78bfa');
  drawPill(W - 88, 52, '🪙 ' + sessionCoins,   '#FFD700');
  if (comboMultiplier > 1) drawPill(W / 2, 52, '🔥x' + comboMultiplier, '#FF8C00');

  if (ngPlusActive) {
    ctx.font = 'bold 9px "Press Start 2P"';
    ctx.fillStyle = '#FF4400';
    ctx.textAlign = 'left';
    ctx.fillText('⚡ NG+' + prestigeLevel, 16, 76);
  }

  if (ghostPlayback.length) {
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#00FFFF';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('👻 GHOST', 16, ngPlusActive ? 90 : 76);
    ctx.globalAlpha = 1;
  }

  // bottom left — player name
  if (name) {
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.textAlign = 'left';
    ctx.fillText('👤 ' + name, 14, H - 20);
  }

  // bottom right — weather
  const weatherLabel = (window._weather || WEATHERS[0]).label;
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(weatherLabel, W - 14, H - 20);

  // controls hint — very bottom right
  ctx.font = '7px "Press Start 2P"';
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillText('[M] Mute  [P] Pause', W - 14, H - 8);

  // feedback overlays
  if (nearMissFlash > 0) {
    nearMissFlash -= 0.02;
    ctx.globalAlpha = Math.min(1, nearMissFlash);
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#00FF88';
    ctx.textAlign = 'center';
    ctx.fillText(nearMissText, W / 2, H * 0.6);
    ctx.globalAlpha = 1;
  }

  if (closeCallFlash > 0) {
    closeCallFlash -= 0.007;
    ctx.globalAlpha = Math.min(1, closeCallFlash * 0.4);
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#FF6644';
    ctx.textAlign = 'center';
    ctx.fillText('YOU WERE ' + closeCallDist + 'm AWAY...', W / 2, H * 0.45);
    ctx.globalAlpha = 1;
  }

  if (multiplierFlash > 0) {
    multiplierFlash -= 0.016;
    ctx.globalAlpha = Math.min(1, multiplierFlash);
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = comboMultiplier >= 3 ? '#FF4400' : '#FFD700';
    ctx.textAlign = 'center';
    ctx.fillText(multiplierText, W / 2, H * 0.72);
    ctx.globalAlpha = 1;
  }

  if (hotStreakFlash > 0) {
    ctx.globalAlpha = Math.min(1, hotStreakFlash);
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#FF6600';
    ctx.textAlign = 'center';
    ctx.fillText('🔥 HOT STREAK!', W / 2, H * 0.88);
    ctx.globalAlpha = 1;
  }

  if (checkpointFlash > 0) {
    checkpointFlash -= 0.01;
    ctx.globalAlpha = Math.min(1, checkpointFlash);
    ctx.fillStyle = 'rgba(0,160,80,0.82)';
    ctx.font = 'bold 13px monospace';
    const cpW = ctx.measureText('✅ ' + checkpointLabel).width + 48;
    ctx.beginPath(); ctx.roundRect(W / 2 - cpW / 2, H * 0.33 - 18, cpW, 42, 10); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('✅ ' + checkpointLabel, W / 2, H * 0.33 + 10);
    ctx.globalAlpha = 1;
  }

  if (xpFlashText && Date.now() - xpFlashTimer < 1400) {
    ctx.globalAlpha = 1 - (Date.now() - xpFlashTimer) / 1400;
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#BB88FF';
    ctx.textAlign = 'center';
    ctx.fillText(xpFlashText, W / 2, H * 0.82);
    ctx.globalAlpha = 1;
  }

  // XP bar — very bottom, 4px tall
  const barW2 = W * 0.48;
  const barX2 = (W - barW2) / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fillRect(barX2, H - 5, barW2, 4);
  ctx.fillStyle = '#c084fc';
  ctx.fillRect(barX2, H - 5, barW2 * (xpInfo.current / xpInfo.needed), 4);

  drawProgressBar();
}

// ── MENU ─────────────────────────────────────────────────────

function drawCityscapeFallback() {
  ctx.fillStyle = '#1a0f05';
  ctx.fillRect(0, 0, W, H);
  buildings.forEach(b => {
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(b.x, H - b.h, b.w, b.h);
  });
  windows.forEach(win => {
    win.elapsed += 1 / 60;
    if (win.elapsed >= win.timer) {
      win.on = !win.on;
      win.elapsed = 0;
      win.timer = 0.4 + Math.random() * 1.8;
    }
    if (win.on) {
      ctx.fillStyle = 'rgba(255,180,60,0.7)';
      ctx.fillRect(win.x, win.y, win.w, win.h);
    }
  });
  carStreaks.forEach(c => {
    c.x += c.speed;
    if (c.x > W + 100) c.x = -150;
    ctx.fillStyle = 'rgba(255,255,180,0.5)';
    ctx.fillRect(c.x, c.y, 80, 3);
  });
}

function drawMenuScreen(W, H, taglineIndex, streak) {
  ctx.clearRect(0, 0, W, H);
  // semi-transparent overlay so video behind shows through
  ctx.fillStyle = 'rgba(0,0,0,0.50)';
  ctx.fillRect(0, 0, W, H);

  drawLightRays(W, H);

  // amber floating particles
  menuParticles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.y < -5) p.y = H + 5;
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = 'rgba(255,160,50,0.8)';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  });

  // white dust particles
  dust.forEach(d => {
    d.x += d.vx; d.y += d.vy;
    if (d.y < -5) { d.y = H + 5; d.x = Math.random() * W; }
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(d.x, d.y, 1.2, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  // title — Y 15%
  const grad = ctx.createLinearGradient(W / 2, H * 0.12, W / 2, H * 0.20);
  grad.addColorStop(0, '#FFD700');
  grad.addColorStop(1, '#FF6B00');
  ctx.font = 'bold ' + Math.min(52, W * 0.05) + "px 'Cinzel', serif";
  ctx.shadowColor = '#FF8C00'; ctx.shadowBlur = 40;
  ctx.fillStyle = grad; ctx.textAlign = 'center';
  ctx.fillText('ECHOES OF FALL', W / 2, H * 0.15);
  ctx.shadowBlur = 0;

  // subtitle — Y 22%
  ctx.font = 'italic ' + Math.min(13, W * 0.016) + "px 'Cinzel', serif";
  ctx.fillStyle = 'rgba(255,220,150,0.7)';
  ctx.fillText('Climb. Fall. Repeat.', W / 2, H * 0.22);

  // tagline — Y 28%
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText(TAGLINES[taglineIndex], W / 2, H * 0.28);

  // streak — bottom right only, NOT center screen
  if (streak && streak.count > 1) {
    ctx.font = '8px "Press Start 2P"';
    ctx.fillStyle = '#FF8C00';
    ctx.textAlign = 'right';
    ctx.fillText('🔥 Day ' + streak.count + ' Streak!', W - 14, H * 0.954);
  }

  // bottom left — eSewa only, no buymeacoffee
  ctx.textAlign = 'left';
  ctx.font = '7px "Press Start 2P"';
  ctx.fillStyle = 'rgba(255,180,50,0.65)';
  ctx.fillText('Support: eSewa 9817959961', 14, H - 10);

  // bottom right — level + coins
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.fillText('⭐ LV.' + getLevel(xp) + '  🪙 ' + totalCoins, W - 14, H - 10);
}

function drawMenuOverlay(taglineIndex, streakCount) {
  drawMenuScreen(W, H, taglineIndex, { count: streakCount });
}

function drawMenuButtons(mouseX, mouseY) {
  const btnStartY = H * 0.37;
  const btnW = Math.min(240, W * 0.33);
  const btnH = 40;
  const btnGap = 8;
  const rects = [];

  MENU_BUTTONS.forEach((b, i) => {
    const bx = W / 2 - btnW / 2;
    const by = btnStartY + i * (btnH + btnGap);
    const hover = pointInRect(mouseX, mouseY, { x: bx, y: by, w: btnW, h: btnH });

    ctx.fillStyle = hover ? 'rgba(192,132,252,0.2)' : 'rgba(8,4,0,0.78)';
    ctx.strokeStyle = hover ? '#e879f9' : '#c084fc';
    ctx.lineWidth = hover ? 2 : 1.5;
    if (hover) { ctx.shadowColor = '#e879f9'; ctx.shadowBlur = 10; }
    roundRect(ctx, bx, by, btnW, btnH, 6);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = hover ? '#fff' : '#e879f9';
    ctx.font = (hover ? 'bold ' : '') + "12px 'Cinzel', serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.label, bx + btnW / 2, by + btnH / 2);
    ctx.textBaseline = 'alphabetic';

    rects.push({ id: b.id, x: bx, y: by, w: btnW, h: btnH });
  });

  return rects;
}

// ── OTHER SCREENS ────────────────────────────────────────────

function drawHowToScreen(mouseX, mouseY) {
  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#e879f9';
  ctx.font = 'bold 11px "Press Start 2P"';
  ctx.fillText('HOW TO PLAY', W / 2, H * 0.08);

  ctx.font = 'bold 9px "Press Start 2P"';
  ctx.fillStyle = '#c084fc';
  ctx.fillText('CONTROLS', W / 2, H * 0.17);

  const controls = [
    'A / D or ← → — Move',
    'Space / Up / W — Jump',
    'Hold jump for higher arc',
    'M — Mute / Unmute',
    'P — Pause',
  ];
  ctx.font = '8px "Press Start 2P"';
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  controls.forEach((line, i) => ctx.fillText(line, W / 2, H * 0.25 + i * 30));

  ctx.font = 'bold 9px "Press Start 2P"';
  ctx.fillStyle = '#c084fc';
  ctx.fillText('WHY THIS GAME?', W / 2, H * 0.57);

  ctx.font = '8px "Press Start 2P"';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  [
    '⚡ No checkpoints. No mercy.',
    '🧠 Pure skill — no luck.',
    '🏙️ Built by Nepali students 🇳🇵',
    '🔥 XP, skins, leaderboard, ghost.',
    '📱 Share your deaths. Dare friends.',
  ].forEach((line, i) => ctx.fillText(line, W / 2, H * 0.64 + i * 24));

  const bw = 140, bh = 34;
  const bx = W / 2 - bw / 2, by = H - 28 - bh / 2;
  const hover = pointInRect(mouseX, mouseY, { x: bx, y: by, w: bw, h: bh });
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeStyle = hover ? '#e879f9' : '#c084fc';
  ctx.lineWidth = 1.5;
  roundRect(ctx, bx, by, bw, bh, 6);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = '9px "Press Start 2P"';
  ctx.fillText('← BACK', W / 2, by + bh / 2 + 4);

  return { x: bx, y: by, w: bw, h: bh };
}

function drawNameScreen(nameValue) {
  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFD700';
  ctx.font = "bold 20px 'Cinzel', serif";
  ctx.textAlign = 'center';
  ctx.fillText('ENTER YOUR NAME', W / 2, H * 0.35);

  roundRect(ctx, W / 2 - 160, H * 0.43, 320, 52, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
  ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2; ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px monospace';
  ctx.fillText((nameValue || '') + '█', W / 2, H * 0.43 + 34);

  ctx.font = '9px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('Type name (max 12 chars) then press ENTER', W / 2, H * 0.58);
}

function drawPauseOverlay(mouseX, mouseY) {
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold ' + Math.min(22, W * 0.028) + 'px "Press Start 2P"';
  ctx.fillText('PAUSED', W / 2, H * 0.37);

  const buttons = [
    { id: 'resume',  label: 'RESUME',       y: H * 0.51 },
    { id: 'menu',    label: 'QUIT TO MENU', y: H * 0.61 },
  ];
  const rects = [];
  buttons.forEach(b => {
    const bw = 195, bh = 34, bx = W / 2 - bw / 2;
    const hover = pointInRect(mouseX, mouseY, { x: bx, y: b.y - bh / 2, w: bw, h: bh });
    roundRect(ctx, bx, b.y - bh / 2, bw, bh, 6);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill();
    ctx.strokeStyle = hover ? '#e879f9' : '#c084fc';
    ctx.lineWidth = hover ? 2 : 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '9px "Press Start 2P"';
    ctx.fillText(b.label, W / 2, b.y + 4);
    rects.push({ id: b.id, x: bx, y: b.y - bh / 2, w: bw, h: bh });
  });

  drawDonationBlock(W, H, H * 0.75);
  return rects;
}

function drawVictoryOverlay(mouseX, mouseY, victoryButtons) {
  ctx.fillStyle = 'rgba(0,0,0,0.82)';
  ctx.fillRect(0, 0, W, H);

  if (!window._victoryParticles) {
    window._victoryParticles = Array.from({ length: 30 }, () => ({
      x: Math.random() * W, y: Math.random() * H, vy: 1 + Math.random() * 2,
    }));
  }
  window._victoryParticles.forEach(p => {
    p.y += p.vy;
    if (p.y > H) p.y = -10;
    ctx.fillStyle = '#FFD700'; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  ctx.font = 'bold ' + Math.min(20, W * 0.027) + "px 'Cinzel', serif";
  ctx.fillStyle = '#FFD700'; ctx.textAlign = 'center';
  ctx.fillText('YOU REACHED THE TOP!', W / 2, H * 0.10);

  const heightM = player ? heightInMeters(player.position.y) : 0;
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillStyle = '#fff';
  [
    'Player: ' + (typeof playerName !== 'undefined' ? playerName : '???'),
    'Height: ' + heightM + 'm',
    'Time: ' + formatTime(elapsed),
    'Deaths: ' + deaths,
    'Coins: ' + sessionCoins,
    'Level: ' + getLevel(xp),
  ].forEach((line, i) => ctx.fillText(line, W / 2, H * 0.23 + i * 26));

  // no challenge code shown — removed
  drawDonationBlock(W, H, H * 0.87);

  const rects = [];
  victoryButtons.forEach((b, i) => {
    const by = H * 0.69 + i * 44;
    const bw = 210, bh = 34, bx = W / 2 - bw / 2;
    const hover = pointInRect(mouseX, mouseY, { x: bx, y: by - bh / 2, w: bw, h: bh });
    roundRect(ctx, bx, by - bh / 2, bw, bh, 4);
    ctx.fillStyle = 'rgba(10,5,20,0.8)'; ctx.fill();
    ctx.strokeStyle = hover ? '#FFD700' : '#c084fc';
    ctx.lineWidth = hover ? 2 : 1.5;
    ctx.stroke();
    ctx.fillStyle = hover ? '#FFD700' : '#e879f9';
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillText(b.label, W / 2, by + 4);
    rects.push({ id: b.id, x: bx, y: by - bh / 2, w: bw, h: bh });
  });
  return rects;
}

function drawPanelScreen(title, lines, mouseX, mouseY, useFallback) {
  if (useFallback) drawCityscapeFallback();
  ctx.fillStyle = 'rgba(0,0,0,0.48)';
  ctx.fillRect(0, 0, W, H);

  const pw = Math.min(420, W - 40);
  const ph = 60 + lines.length * 28 + 60;
  const px = (W - pw) / 2, py = (H - ph) / 2;

  ctx.fillStyle = 'rgba(0,0,0,0.82)';
  roundRect(ctx, px, py, pw, ph, 12); ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FF9500';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(title, W / 2, py + 34);

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '14px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, W / 2, py + 66 + i * 28));

  const bw = 140, bh = 38;
  const bx = W / 2 - bw / 2, by = py + ph - 50;
  const hover = pointInRect(mouseX, mouseY, { x: bx, y: by, w: bw, h: bh });
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeStyle = hover ? '#FFBB44' : '#FF9500';
  ctx.lineWidth = 1.5;
  roundRect(ctx, bx, by, bw, bh, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('← BACK', W / 2, by + bh / 2 + 5);

  return { x: bx, y: by, w: bw, h: bh };
}

function drawGameWorld(ngPlusActive) {
  ctx.clearRect(0, 0, W, H);
  // transparent overlay — video shows through
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(0, 0, W, H);

  if (player) {
    recordReplayFrame(
      player.position.x, player.position.y,
      player.velocity.x, player.velocity.y,
      currentPose, facingRight
    );
  }

  cameraY = getCameraY(H);

  if (updateReplay(ctx, canvas, cameraY, currentSkin)) {
    drawDeathEffects();
    drawFloatingTextsScreen();
    return;
  }

  ctx.save();
  applyShake();
  ctx.translate(0, -cameraY);

  drawParallax(cameraY);

  platformBodies.forEach(p => {
    if (p.broken) return;
    if (p.platformType === 'portal') { drawPortal(p); return; }
    if (p.platformType === 'spring') { drawSpringPad(p); return; }
    if (p.platformType === 'speed')  { drawSpeedPad(p); return; }
    drawBoulderPlatform(p);
  });

  levelCoins.forEach(drawCoin);
  if (typeof levelSpikes !== 'undefined') levelSpikes.forEach(drawSpike);

  drawCheckpointFlag(80, 2060, '🏙️ STREET',   checkpoint && checkpoint.floor >= 1);
  drawCheckpointFlag(80, 1360, '🏗️ ROOFTOPS', checkpoint && checkpoint.floor >= 2);
  drawCheckpointFlag(80, 500,  '☁️ SKY',       checkpoint && checkpoint.floor >= 3);

  drawNPCCrowd();
  drawTrail();
  drawGhostReplay();
  drawPlayerCharacter();
  drawParticlesWorld();

  ctx.restore();

  drawWeatherEffects();
  drawDeathEffects();
  drawQuoteOverlay();
  drawHUD(ngPlusActive, prestige, typeof playerName !== 'undefined' ? playerName : '');
  drawFloatingTextsScreen();
}