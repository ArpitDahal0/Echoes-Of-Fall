// audio.js
// music + sfx

const menuAudio = document.getElementById('menuAudio');
if (menuAudio) {
  menuAudio.volume = 0;
  menuAudio.addEventListener('error', () => console.warn('music.mp3 not found in assets/ — add it'));
}
let musicStarted = false;
let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      audioCtx = null;
    }
  }
  return audioCtx;
}

function startAudioOnInteraction() {
  const ctx = getCtx();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

function startMusic() {
  if (!menuAudio || musicStarted) return;
  musicStarted = true;
  menuAudio.play().catch(e => console.log('audio blocked:', e));
  fadeMusic(0.38);
}

function fadeMusic(target) {
  if (!menuAudio) return;
  const t = setInterval(() => {
    const diff = target - menuAudio.volume;
    if (Math.abs(diff) < 0.01) {
      menuAudio.volume = target;
      clearInterval(t);
      return;
    }
    menuAudio.volume = clamp(menuAudio.volume + (diff > 0 ? 0.012 : -0.012), 0, 1);
  }, 75);
}

document.addEventListener('click', startMusic, { once: true });
document.addEventListener('keydown', startMusic, { once: true });

function playTone(freq, dur, type, gainVal, ramp) {
  const ctx = getCtx();
  if (!ctx || (menuAudio && menuAudio.muted)) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(ramp ? ramp.from : freq, t);
  if (ramp) o.frequency.linearRampToValueAtTime(ramp.to, t + dur);
  g.gain.setValueAtTime(gainVal, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.01);
}

function playNoise(dur, gainVal, lpFreq) {
  const ctx = getCtx();
  if (!ctx || (menuAudio && menuAudio.muted)) return;
  const t = ctx.currentTime;
  const bufSize = ctx.sampleRate * dur;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lpFreq;
  g.gain.setValueAtTime(gainVal, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  src.start(t);
}

function playJumpSound() {
  const ctx = getCtx();
  if (!ctx || (menuAudio && menuAudio.muted)) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = 'sine';
  o.frequency.setValueAtTime(300, ctx.currentTime);
  o.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.12);
  g.gain.setValueAtTime(0.18, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
  o.start(); o.stop(ctx.currentTime + 0.15);
}

function playLandSound() {
  playNoise(0.018, 0.22, 300);
}

function playDeathSound() {
  const ctx = getCtx();
  if (!ctx || (menuAudio && menuAudio.muted)) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(440, ctx.currentTime);
  o.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.6);
  g.gain.setValueAtTime(0.28, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
  o.start(); o.stop(ctx.currentTime + 0.6);
}

function playClimbSound() {
  const ctx = getCtx();
  if (!ctx || (menuAudio && menuAudio.muted)) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = 'triangle';
  o.frequency.setValueAtTime(200, ctx.currentTime);
  o.frequency.linearRampToValueAtTime(420, ctx.currentTime + 0.09);
  g.gain.setValueAtTime(0.1, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.09);
  o.start(); o.stop(ctx.currentTime + 0.09);
}

function playCoinSound() {
  const ctx = getCtx();
  if (!ctx || (menuAudio && menuAudio.muted)) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = 'sine';
  o.frequency.setValueAtTime(660, ctx.currentTime);
  o.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.07);
  g.gain.setValueAtTime(0.15, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
  o.start(); o.stop(ctx.currentTime + 0.1);
}

function playSpringSound() {
  playTone(280, 0.055, 'sine', 0.25, { from: 280, to: 980 });
}

function playSpeedSound() {
  [440, 554, 659].forEach((f, i) => setTimeout(() => playTone(f, 0.035, 'sine', 0.2), i * 35));
}

function playVictorySound() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.035, 'sine', 0.25), i * 35));
}

function playCheckpointSound() {
  playTone(660, 0.25, 'sine', 0.2, { from: 660, to: 880 });
}

function toggleMute() {
  if (!menuAudio) return;
  menuAudio.muted = !menuAudio.muted;
  if (audioCtx) audioCtx.state === 'suspended' ? audioCtx.resume() : audioCtx.suspend();
}
