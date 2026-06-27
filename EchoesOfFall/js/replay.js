// replay.js
// records last 3s of movement, plays back slow-mo on death
// - Sushant

const REPLAY_MAX_FRAMES = 90; // 3 seconds at ~30fps

let replayBuffer = [];
let replayPlaying = false;
let replayFrameIndex = 0;
let replayFrames = [];
let onReplayComplete = null;
let _replayLastAdvance = 0; // fixes the double-advance bug

function recordReplayFrame(px, py, vx, vy, pose, fr) {
  replayBuffer.push({ px, py, vx, vy, pose: pose || 'idle', facingRight: fr });
  if (replayBuffer.length > REPLAY_MAX_FRAMES) replayBuffer.shift();
}

function triggerReplay(callback) {
  if (replayBuffer.length < 4) {
    callback();
    return;
  }
  replayFrames = [...replayBuffer];
  replayBuffer = [];
  replayFrameIndex = 0;
  replayPlaying = true;
  onReplayComplete = callback;
  _replayLastAdvance = Date.now();
}

// returns true while replay is active — caller should skip normal draw
function updateReplay(ctx, canvasEl, cameraYVal, skin) {
  if (!replayPlaying) return false;

  const rw = canvasEl.width;
  const rh = canvasEl.height;

  // advance one frame every 80ms — real slow motion, not timer-based
  const now = Date.now();
  if (now - _replayLastAdvance >= 80) {
    replayFrameIndex++;
    _replayLastAdvance = now;
  }

  // replay finished
  if (replayFrameIndex >= replayFrames.length) {
    replayPlaying = false;
    const cb = onReplayComplete;
    onReplayComplete = null; // null BEFORE calling so it can't fire twice
    if (cb) cb();
    return false;
  }

  const f = replayFrames[replayFrameIndex];
  const progress = replayFrameIndex / replayFrames.length;

  // ── OVERLAY ──────────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.60)';
  ctx.fillRect(0, 0, rw, rh);

  // ── REPLAY LABEL ─────────────────────────────────────────
  ctx.save();
  const pulse = 0.7 + Math.sin(now / 180) * 0.3;
  ctx.font = 'bold 22px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(255,60,60,${pulse})`;
  ctx.shadowColor = '#FF0000';
  ctx.shadowBlur = 16;
  ctx.fillText('💀 REPLAY', rw / 2, 52);
  ctx.shadowBlur = 0;
  ctx.font = '8px "Press Start 2P"';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('SLOW MOTION', rw / 2, 74);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();

  // ── GHOST TRAIL ──────────────────────────────────────────
  const trailLen = Math.min(6, replayFrameIndex);
  for (let i = trailLen; i >= 1; i--) {
    const tf = replayFrames[replayFrameIndex - i];
    if (!tf) continue;
    const alpha = (1 - i / (trailLen + 1)) * 0.15;
    const tsy = tf.py - cameraYVal;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(tf.px, tsy);
    if (!tf.facingRight) ctx.scale(-1, 1);
    ctx.fillStyle = '#FF4444';
    ctx.fillRect(-5, -20, 10, 20);
    ctx.beginPath(); ctx.arc(0, -24, 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ── PLAYER ───────────────────────────────────────────────
  const sx = f.px;
  const sy = f.py - cameraYVal;
  const activeSkin = skin || (typeof SKINS !== 'undefined' ? SKINS[0] : null);
  const replaySkin = activeSkin
    ? { ...activeSkin, body: '#BB2222', accent: '#FF6666', belt: '#FF2222' }
    : { body: '#BB2222', accent: '#FF6666', belt: '#FF2222' };

  ctx.save();
  ctx.translate(sx, sy);
  if (!f.facingRight) ctx.scale(-1, 1);
  drawPlayerPose(ctx, replaySkin, f.pose);
  ctx.restore();

  // ── VELOCITY ARROW ────────────────────────────────────────
  const speed = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
  if (speed > 0.5) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,120,120,0.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + f.vx * 10, sy + f.vy * 10);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ── PROGRESS BAR ─────────────────────────────────────────
  const barW = rw * 0.55;
  const barX = (rw - barW) / 2;
  const barY = rh - 22;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath(); ctx.roundRect(barX, barY, barW, 5, 3); ctx.fill();
  ctx.fillStyle = '#FF4444';
  ctx.beginPath(); ctx.roundRect(barX, barY, barW * progress, 5, 3); ctx.fill();

  // time remaining
  const msLeft = Math.max(0, (replayFrames.length - replayFrameIndex) * 80);
  ctx.font = '7px "Press Start 2P"';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.textAlign = 'center';
  ctx.fillText((msLeft / 1000).toFixed(1) + 's', rw / 2, barY - 5);

  return true;
}