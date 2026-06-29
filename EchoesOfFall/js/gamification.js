// gamification.js
// xp, coins, streaks, ghost, leaderboard, share, hall of shame
// - Sushant

let xp = lsGet('eof_xp', 0);
let totalCoins = lsGet('eof_coins', 0);
let sessionCoins = 0;
let coinCombo = 0;
let comboMultiplier = 1;
let deaths = 0;
let prestige = lsGet('eof_prestige', 0);
let streak = checkStreak();

let xpFlashText = '';
let xpFlashTimer = 0;
let lastXpHeight = 0;
let lastMilestone = 0;

let ghostFrames = [];
let ghostPlayback = lsGet('eof_ghost', []);
let recordingGhost = false;
let ghostFrameTick = 0;

let checkpoint = null;
let checkpointY = CONFIG.spawnY;
let checkpointFlash = 0;
let checkpointLabel = '';

let nearMissFlash = 0;
let nearMissText = '';
let closeCallFlash = 0;
let closeCallDist = 0;
let hotStreakFlash = 0;
let lastHeightForStreak = 0;
let lastHeightTime = Date.now();
let multiplierFlash = 0;
let multiplierText = '';
let quoteText = '';
let quoteUntil = 0;
let currentTaunt = '';

let deathLocations = [];

// ── XP / LEVEL ──────────────────────────────────────────────

function getLevel(xpVal) {
  let level = 1, needed = 100, cur = xpVal;
  while (cur >= needed) {
    cur -= needed;
    level++;
    needed = Math.floor(needed * 1.4);
  }
  return level;
}

function xpToNextLevel(currentXp) {
  let cur = currentXp, needed = 100;
  while (cur >= needed) {
    cur -= needed;
    needed = Math.floor(needed * 1.4);
  }
  return { current: cur, needed, level: getLevel(currentXp) };
}

function addXP(amount, label, px, py) {
  xp += amount;
  lsSet('eof_xp', xp);
  xpFlashText = '+' + amount + ' XP  ' + (label || '');
  xpFlashTimer = Date.now();
  if (typeof spawnFloatingText === 'function' && px != null) {
    spawnFloatingText('+' + amount + ' XP', px, py, '#c084fc');
  }
}

// ── COINS ────────────────────────────────────────────────────

function collectCoin(coin, px, py) {
  if (coin.collected) return;
  coin.collected = true;
  
  // ONLY add to session coins. Do not save to localStorage yet!
  sessionCoins++;
  coinCombo++;
  comboMultiplier = coinCombo >= 5 ? 3 : coinCombo >= 3 ? 2 : 1;

  if (comboMultiplier > 1) {
    multiplierText = 'x' + comboMultiplier + ' COMBO!';
    multiplierFlash = 1.5;
  }

  playCoinSound();
  addXP(10 * comboMultiplier, 'COIN', px, py);
  spawnDust(coin.x, coin.y, 6, 'rgba(255,215,0,0.8)');
  spawnFloatingText(comboMultiplier > 1 ? '🔥x' + comboMultiplier : '🪙', px, py - 20, '#FFD700');
}

// ── SKIN SHOP ────────────────────────────────────────────────

function isSkinUnlocked(skin) {
  if (skin.unlock === 'free') return true;
  if (skin.unlock === 'height50') return lsGet('eof_best_height', 0) >= 50;
  if (skin.unlock === 'deaths10') return lsGet('eof_total_deaths', 0) >= 10;
  if (skin.unlock === 'ng+') return lsGet('eof_prestige', 0) > 0;
  if (skin.unlock === 'coins') {
    const owned = lsGet('eof_owned_skins', []);
    return owned.includes(skin.id);
  }
  return false;
}

function buySkinWithCoins(skin) {
  if (!skin.cost || skin.cost <= 0) return false;
  const currentCoins = lsGet('eof_coins', 0);
  if (currentCoins < skin.cost) return false;

  // deduct coins
  const newTotal = currentCoins - skin.cost;
  lsSet('eof_coins', newTotal);
  totalCoins = newTotal;

  // mark as owned
  const owned = lsGet('eof_owned_skins', []);
  if (!owned.includes(skin.id)) {
    owned.push(skin.id);
    lsSet('eof_owned_skins', owned);
  }
  return true;
}

// ── DEATH ────────────────────────────────────────────────────

function recordDeathLocation(px, py, heightM) {
  deathLocations.push({ x: px, y: py, height: heightM, num: deaths });
  if (deathLocations.length > 50) deathLocations.shift();
}

function getWorstFalls() {
  return [...deathLocations].sort((a, b) => b.height - a.height).slice(0, 3);
}

function onDeath(playerName) {
  deaths++;
  const totalDeaths = lsGet('eof_total_deaths', 0) + 1;
  lsSet('eof_total_deaths', totalDeaths);
  
  // PUNISHMENT: Lose all unbanked coins collected during this life!
  sessionCoins = 0; 
  
  coinCombo = 0;
  comboMultiplier = 1;
  multiplierFlash = 0;
  playDeathSound();

  const lb = lsGet('eof_leaderboard', []);
  const rival = lb.find(r => r.name && r.name !== playerName);
  currentTaunt = (rival && Math.random() > 0.45)
    ? TAUNTS[randInt(0, TAUNTS.length - 1)](rival.name)
    : '';
}

function showDeathQuote(quote) {
  quoteText = quote || DEATH_QUOTES[randInt(0, DEATH_QUOTES.length - 1)];
  quoteUntil = Date.now() + 2800;
}

function onDeathCloseCall(playerY) {
  const hAtDeath = heightInMeters(playerY);
  const nextCp = FLOOR_CHECKPOINT_YS
    ? FLOOR_CHECKPOINT_YS.find(cp => cp.heightM > hAtDeath)
    : null;
  if (nextCp) {
    const dist = nextCp.heightM - hAtDeath;
    if (dist <= 15) {
      closeCallFlash = 5.0;
      closeCallDist = dist;
    }
  }
}

// ── LEADERBOARD ──────────────────────────────────────────────

function saveToLeaderboard(name, heightM, timeMs) {
  const board = lsGet('eof_leaderboard', []);
  board.push({
    name: name || 'UNKNOWN',
    height: heightM,
    time: timeMs,
    date: new Date().toLocaleDateString(),
    prestige,
  });
  board.sort((a, b) => a.time - b.time);
  lsSet('eof_leaderboard', board.slice(0, 5));
  const best = lsGet('eof_best_height', 0);
  if (heightM > best) lsSet('eof_best_height', heightM);
}

// ── GHOST REPLAY ─────────────────────────────────────────────

function startGhostRecord() {
  ghostFrames = [];
  recordingGhost = true;
}

function recordGhostFrame(px, py) {
  if (!recordingGhost) return;
  ghostFrameTick++;
  if (ghostFrameTick % 3 === 0) {
    ghostFrames.push({ x: Math.round(px), y: Math.round(py) });
    if (ghostFrames.length > 3000) ghostFrames.shift();
  }
}

function saveGhostIfBest(timeMs) {
  const board = lsGet('eof_leaderboard', []);
  const bestTime = board.length ? board[0].time : Infinity;
  if (timeMs <= bestTime) {
    lsSet('eof_ghost', ghostFrames.slice(-2000));
    ghostPlayback = ghostFrames.slice(-2000);
  }
}

function loadGhost() {
  ghostPlayback = lsGet('eof_ghost', []);
}

// ── SHARE ────────────────────────────────────────────────────

function getShareText(name, heightM, timeMs, deathCount) {
  return 'I climbed ' + heightM + 'm in Echoes of Fall 🏙️\n' +
    '💀 ' + deathCount + ' deaths | ⏱️ ' + formatTime(timeMs) + '\n' +
    '⭐ Level ' + getLevel(xp) + ' | 🪙 ' + sessionCoins + ' coins\n' +
    'Can you beat me? 🇳🇵 Built in Nepal\neSewa support: 9817959961';
}

function copyShareText(name, heightM, timeMs) {
  const text = getShareText(name, heightM, timeMs, deaths);
  navigator.clipboard.writeText(text)
    .then(() => spawnFloatingText('Copied! Share on TikTok 🎮', canvas.width / 2, 200, '#4ade80'))
    .catch(() => {});
}

// ── SESSION RESET ────────────────────────────────────────────

function resetSessionGamification() {
  sessionCoins = 0;
  coinCombo = 0;
  comboMultiplier = 1;
  deaths = 0;
  checkpoint = null;
  checkpointY = CONFIG.spawnY;
  checkpointFlash = 0;
  lastXpHeight = 0;
  lastMilestone = 0;
  nearMissFlash = 0;
  closeCallFlash = 0;
  hotStreakFlash = 0;
  lastHeightForStreak = 0;
  lastHeightTime = Date.now();
  quoteText = '';
  quoteUntil = 0;
  currentTaunt = '';
  ghostFrames = [];
  ghostFrameTick = 0;
  deathLocations = [];
  if (typeof replayBuffer !== 'undefined') replayBuffer = [];
}

// ── RESPAWN ──────────────────────────────────────────────────

function getRespawnPoint(spawnXVal, spawnYVal) {
  return checkpoint
    ? { x: checkpoint.x, y: checkpoint.y }
    : { x: spawnXVal, y: spawnYVal };
}

// ── PER-FRAME UPDATE ─────────────────────────────────────────

function updateGamificationDuringPlay(player, playerName, W) {
  if (!player) return;

  const hNow = heightInMeters(player.position.y);
  const best = lsGet('eof_best_height', 0);
  if (hNow > best) lsSet('eof_best_height', hNow);

  if (hNow > 0 && hNow % 10 === 0 && hNow > lastXpHeight) {
    lastXpHeight = hNow;
    addXP(5, hNow + 'm');
  }

  if (hNow > 0 && hNow % 50 === 0 && hNow !== lastMilestone) {
    lastMilestone = hNow;
    playClimbSound();
  }

  if (hNow > lastHeightForStreak + 8) {
    if (Date.now() - lastHeightTime < 3500) hotStreakFlash = 2.0;
    lastHeightForStreak = hNow;
    lastHeightTime = Date.now();
  }
  if (hotStreakFlash > 0) hotStreakFlash -= 0.008;

  if (typeof FLOOR_CHECKPOINTS !== 'undefined') {
    FLOOR_CHECKPOINTS.forEach(cp => {
      if (checkpoint && checkpoint.floor >= cp.floor) return;
      if (player.position.y <= cp.y) {
        checkpoint = { x: W / 2, y: cp.y + 60, floor: cp.floor };
        checkpointY = checkpoint.y;
        checkpointFlash = 3.5;
        checkpointLabel = cp.label;
        if (typeof playCheckpointSound === 'function') playCheckpointSound();
        addXP(50, 'CHECKPOINT!');
      }
    });
  }
}