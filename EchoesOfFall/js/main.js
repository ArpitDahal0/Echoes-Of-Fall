// main.js - game loop and screen manager
// ties everything together
// - Roshan

let screen = 'menu';
let playerName = lsGet('eof_playername', '');
let currentSkin = lsGet('eof_skin', SKINS[0]);
if (!currentSkin || !currentSkin.id) currentSkin = SKINS[0];
let ngPlus = false;
let nameEntryValue = '';
let nameEntryCallback = null;

let mouseX = 0, mouseY = 0;
let taglineIndex = 0;
let taglineTimer = Date.now();

let fadeAlpha = 0;
let fadeTarget = 0;
let fadeCallback = null;

let victorySaved = false;

// Replaces setTimeout for death warping
let pendingRespawnTime = 0;
let pendingRespawnHall = false;

const VICTORY_BUTTONS = [
  { id: 'again',  label: 'PLAY AGAIN'    },
  { id: 'share',  label: '📋 COPY & SHARE' },
  { id: 'ngplus', label: '⚡ NG+ MODE'    },
  { id: 'menu',   label: 'MAIN MENU'     },
];

initRenderer();
initPhysics();
loadGhost();

function changeScreen(newScreen) {
  if (typeof clearButtonListeners === 'function') clearButtonListeners(canvas);
  screen = newScreen;
}

function setGameVideo(show) {
  const mv = document.getElementById('menuVideo');
  const gv = document.getElementById('bgVideo');
  if (!mv || !gv) return;
  if (show) {
    mv.style.display = 'none';
    gv.style.display = 'block';
    gv.play().catch(() => {});
  } else {
    gv.style.display = 'none';
    mv.style.display = 'block';
    mv.play().catch(() => {});
  }
}

function fadeToBlack(cb) {
  fadeTarget = 1;
  fadeAlpha = 0;
  fadeCallback = cb;
}

function startGame(fromNgPlus) {
  ngPlus = !!fromNgPlus;
  resetSessionGamification();
  startGhostRecord();
  setGameVideo(true);
  fadeMusic(0.15);
  startGamePhysics(canvas.width, ngPlus);
  changeScreen('game');
  victorySaved = false;
  trailHistory = [];
  window._raindrops = null;
  window._windLines = null;
  window._victoryParticles = null;
}

function returnToMenu() {
  stopGamePhysics();
  setGameVideo(false);
  fadeMusic(0.38);
  ngPlus = false;
  changeScreen('menu');
  victorySaved = false;
  window._victoryParticles = null;
}

function stopGame() {
  stopGamePhysics();
  returnToMenu();
}

function goToMapOverview() {
  changeScreen('mapoverview');
}

function triggerDeath() {
  triggerShake();
  deathFlash = 1;

  const quote = DEATH_QUOTES[randInt(0, DEATH_QUOTES.length - 1)];
  const heightM = heightInMeters(player.position.y);
  updateNPCReactions(heightM, true);

  const showHall = deaths > 0 && deaths % 10 === 0;
  if (showHall) recordDeathLocation(player.position.x, player.position.y, heightM);

  if (engine) engine.timing.timeScale = 0;

  triggerReplay(() => {
    if (engine) engine.timing.timeScale = 1;
    if (showHall) {
      changeScreen('hallofshame');
      pendingRespawnTime = Date.now() + 8000;
      pendingRespawnHall = true;
    } else {
      showDeathQuote(quote);
      pendingRespawnTime = Date.now() + 2800;
      pendingRespawnHall = false;
    }
  });
}

function gameLoop() {
  requestAnimationFrame(gameLoop);
  ctx.clearRect(0, 0, W, H);

  if (Date.now() - taglineTimer > 3000) {
    taglineIndex = (taglineIndex + 1) % TAGLINES.length;
    taglineTimer = Date.now();
  }

  // Handle timed respawn safely inside the loop instead of setTimeout
  if (pendingRespawnTime > 0 && Date.now() >= pendingRespawnTime) {
    pendingRespawnTime = 0;
    if (pendingRespawnHall && screen === 'hallofshame') changeScreen('game');
    const r = getRespawnPoint(spawnX, spawnY);
    resetPlayerPos(canvas.width / 2, r.y);
  }

  if (screen === 'menu') {
    drawMenuScreen(W, H, taglineIndex, streak);
    drawMenuButtons(mouseX, mouseY);
  } else if (screen === 'name') {
    drawNameScreen(nameEntryValue);
  } else if (screen === 'mapoverview') {
    drawMapOverview(W, H);
  } else if (screen === 'hallofshame') {
    drawGameWorld(ngPlus);
    drawHallOfShame(W, H);
  } else if (screen === 'skins') {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    drawSkinsScreenUI(W, H);
  } else if (screen === 'howto') {
    drawHowToScreen(mouseX, mouseY);
  } else if (screen === 'leaderboard') {
    drawLeaderboardScreen(W, H);
  } else if (screen === 'game') {
    drawGameWorld(ngPlus);
  } else if (screen === 'pause') {
    drawGameWorld(ngPlus);
    drawPauseOverlay(mouseX, mouseY);
  } else if (screen === 'victory') {
    drawGameWorld(ngPlus);
    drawVictoryOverlay(mouseX, mouseY, VICTORY_BUTTONS);
  }

  if (fadeAlpha < fadeTarget) {
    fadeAlpha = Math.min(fadeTarget, fadeAlpha + 1 / (600 / 16.67));
    ctx.fillStyle = 'rgba(0,0,0,' + fadeAlpha + ')';
    ctx.fillRect(0, 0, W, H);
    if (fadeAlpha >= fadeTarget && fadeCallback) {
      const cb = fadeCallback;
      fadeCallback = null;
      cb();
      fadeTarget = 0;
      fadeAlpha = 0;
    }
  }
}

canvas.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

canvas.addEventListener('click', e => {
  startAudioOnInteraction();
  handleClick(e.clientX, e.clientY);
});

function handleClick(cx, cy) {
  if (screen === 'menu') {
    const rects = getMenuButtonRectsFromLayout();
    rects.forEach(btn => {
      if (!pointInRect(cx, cy, btn)) return;

      if (btn.id === 'play') {
        const today = new Date().toDateString();
        if (streak.lastDate !== today) streak = checkStreak();
        if (!playerName) {
          nameEntryValue = '';
          nameEntryCallback = () => { fadeToBlack(() => goToMapOverview()); };
          changeScreen('name');
        } else {
          fadeToBlack(() => goToMapOverview());
        }
      } else if (btn.id === 'leaderboard') {
        changeScreen('leaderboard');
      } else if (btn.id === 'skins') {
        changeScreen('skins');
      } else if (btn.id === 'howto') {
        changeScreen('howto');
      } else if (btn.id === 'quit') {
        if (window.confirm('Quit Echoes of Fall?')) window.close();
      }
    });

  } else if (screen === 'leaderboard') {
    const back = { x: W / 2 - 70, y: H - 47, w: 140, h: 26 };
    if (pointInRect(cx, cy, back)) changeScreen('menu');

  } else if (screen === 'skins') {
    const back = { x: W / 2 - 65, y: H - 31, w: 130, h: 26 };
    if (pointInRect(cx, cy, back)) changeScreen('menu');

  } else if (screen === 'howto') {
    const bh = 34;
    const back = { x: W / 2 - 70, y: H - 28 - bh / 2, w: 140, h: bh };
    if (pointInRect(cx, cy, back)) changeScreen('menu');

  } else if (screen === 'pause') {
    const rects = [
      { id: 'resume', x: W / 2 - 97, y: H * 0.51 - 17, w: 195, h: 34 },
      { id: 'menu',   x: W / 2 - 97, y: H * 0.61 - 17, w: 195, h: 34 },
    ];
    rects.forEach(r => {
      if (!pointInRect(cx, cy, r)) return;
      if (r.id === 'resume') {
        changeScreen('game');
        resumePhysics();
      } else {
        stopGame();
      }
    });

  } else if (screen === 'victory') {
    VICTORY_BUTTONS.forEach((b, i) => {
      const by = H * 0.69 + i * 44;
      const rect = { x: W / 2 - 105, y: by - 17, w: 210, h: 34 };
      if (!pointInRect(cx, cy, rect)) return;

      if (b.id === 'again') {
        fadeToBlack(() => goToMapOverview());
      } else if (b.id === 'share') {
        const hM = player ? heightInMeters(player.position.y) : 0;
        copyShareText(playerName, hM, elapsed);
      } else if (b.id === 'ngplus') {
        prestige++;
        lsSet('eof_prestige', prestige);
        fadeToBlack(() => startGame(true));
      } else if (b.id === 'menu') {
        stopGame();
      }
    });
  }
}

function getMenuButtonRectsFromLayout() {
  const btnW = Math.min(240, W * 0.33);
  const btnH = 40;
  const btnGap = 8;
  const startY = H * 0.37;
  return MENU_BUTTONS.map((b, i) => ({
    id: b.id,
    x: W / 2 - btnW / 2,
    y: startY + i * (btnH + btnGap),
    w: btnW,
    h: btnH,
  }));
}

window.addEventListener('keydown', e => {
  if (screen === 'name') {
    e.preventDefault();
    if (e.key === 'Enter' && nameEntryValue.trim().length > 0) {
      playerName = nameEntryValue.trim().slice(0, 12).toUpperCase();
      lsSet('eof_playername', playerName);
      if (nameEntryCallback) {
        nameEntryCallback();
        nameEntryCallback = null;
      } else {
        changeScreen('menu');
      }
    } else if (e.key === 'Backspace') {
      nameEntryValue = nameEntryValue.slice(0, -1);
    } else if (e.key.length === 1 && nameEntryValue.length < 12) {
      nameEntryValue += e.key.toUpperCase();
    }
    return;
  }

  if (screen === 'skins' && (e.key === 'c' || e.key === 'C')) {
    if (typeof ensurePremiumCodeInput === 'function') {
      ensurePremiumCodeInput();
      if (premiumCodeInput) {
        premiumCodeInput.style.display =
          premiumCodeInput.style.display === 'none' ? 'block' : 'none';
      }
    }
    return;
  }

  startAudioOnInteraction();
  keys[e.key] = true;
  keys[e.key.toLowerCase()] = true;

  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    e.preventDefault();
    jumpPressedTime = Date.now();
    pendingJump = true;
  }

  if (e.key === 'm' || e.key === 'M') toggleMute();

  if (screen === 'game') {
    if (e.key === 'p' || e.key === 'P') {
      changeScreen('pause');
      pausePhysics();
    }
  } else if (screen === 'pause') {
    if (e.key === 'p' || e.key === 'P') {
      changeScreen('game');
      resumePhysics();
    }
  }
});

window.addEventListener('keyup', e => {
  keys[e.key] = false;
  keys[e.key.toLowerCase()] = false;

  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    if (player && player.velocity.y < -5) {
      Matter.Body.setVelocity(player, {
        x: player.velocity.x,
        y: player.velocity.y * 0.6,
      });
    }
    pendingJump = false;
  }
});

// START (Waits for fonts to load before kicking off loop)
if (document.fonts) {
  document.fonts.ready.then(() => { gameLoop(); });
} else {
  gameLoop();
}