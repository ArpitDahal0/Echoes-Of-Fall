// utils.js - helper functions
// - Roshan

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function heightInMeters(playerY) {
  return Math.max(0, Math.round((CONFIG.heightBase - playerY) / 30));
}

function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) {
    return fallback;
  }
}

function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

function checkStreak() {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const s = lsGet('eof_streak', { count: 0, lastDate: '' });
  if (s.lastDate === today) return s;
  if (s.lastDate === yesterday) s.count++;
  else s.count = 1;
  s.lastDate = today;
  lsSet('eof_streak', s);
  return s;
}

function getBestHeight() {
  const lb = lsGet('eof_leaderboard', []);
  if (!lb.length) return 0;
  return Math.max(...lb.map(r => r.height || 0));
}

function seededOffset(id, vi) {
  return Math.sin(id * 127 + vi * 43) * 6;
}

// ── BUTTON SYSTEM ─────────────────────────────────────────────

const _btnListeners = new Map();

function drawButton(canvasEl, ctx, cx, cy, w, h, label, color, onClick) {
  const x = cx - w / 2;
  const y = cy - h / 2;

  // draw
  ctx.fillStyle = 'rgba(10,5,20,0.85)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = 'bold 9px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy);
  ctx.textBaseline = 'alphabetic';

  // register click
  const key = label + '|' + Math.round(cx) + '|' + Math.round(cy);
  if (_btnListeners.has(key)) {
    canvasEl.removeEventListener('click', _btnListeners.get(key));
  }
  function handler(e) {
    const rect = canvasEl.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (mx > x && mx < x + w && my > y && my < y + h) {
      onClick();
    }
  }
  _btnListeners.set(key, handler);
  canvasEl.addEventListener('click', handler);
}

function clearButtonListeners(canvasEl) {
  _btnListeners.forEach((fn) => canvasEl.removeEventListener('click', fn));
  _btnListeners.clear();
}