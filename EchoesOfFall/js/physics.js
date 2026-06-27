// physics.js
// matter.js setup and player movement
// - Bibek

const { Engine, Runner, Bodies, Body, Composite, Events, Query, World } = Matter;

let engine, runner, world, player;
let platformBodies = [];
let levelCoins = [];
let levelSpikes = [];
let keys = {};
let pendingJump = false;
let jumpPressedTime = 0;
let lastGroundedTime = 0;
let wasGrounded = false;
let landTime = 0;
let facingRight = true;
let canJump = true;
let currentPose = 'idle';

let peakY = CONFIG.spawnY;
let spawnX = 0;
let spawnY = CONFIG.spawnY;
let gameStarted = false;
let timerStart = 0;
let elapsed = 0;

let deathSpinActive = false;
let deathSpinStart = 0;
let punishCooldownUntil = 0;
let deathHandling = false;

let ghostIdx = 0;
let victoryTriggered = false;

function initPhysics() {
  // engine created in startGamePhysics — nothing to do here
}

// ── GROUNDED CHECK ────────────────────────────────────────────

function isGrounded() {
  if (!player || !engine || !world) return false;
  const hits = Query.ray(
    Composite.allBodies(world),
    { x: player.position.x, y: player.position.y },
    { x: player.position.x, y: player.position.y + 20 },
    20
  );
  return hits.some(h => h.body !== player && !h.body.isSensor);
}

// ── PLATFORM BODY CREATION ────────────────────────────────────

function createPlatformBody(p) {
  const type = defToPlatformType(p);
  const body = Bodies.rectangle(p.x, p.y, p.w, p.h, {
    isStatic: true,
    friction: 0.8,
    restitution: 0,
    label: type,
    // portal and victory are sensors — player passes through them
    isSensor: type === 'portal' || type === 'victory',
  });

  body.platformId = platformIdCounter++;
  body.platformW = p.w;
  body.platformH = p.h;
  body.platformType = type;
  body.platformDef = p;
  body.origX = p.x;
  body.origY = p.y;
  body.moveRange = p.range || 0;
  body.movePeriod = p.speed ? (5 / p.speed) : 3;
  body.moveAxis = p.vertical ? 'y' : 'x';
  body.movePhase = 0;
  body.broken = false;
  body.breakTimer = null;
  body.respawnTimer = null;

  return body;
}

// ── GAME START / STOP ─────────────────────────────────────────

function startGamePhysics(W, ngPlus) {
  // clean up old engine if exists
  if (engine) {
    World.clear(world);
    Engine.clear(engine);
    if (runner) Runner.stop(runner);
  }

  engine = Engine.create();
  engine.gravity.y = CONFIG.gravity;
  runner = Runner.create();
  world = engine.world;

  // random weather each run
  window._weather = WEATHERS[Math.floor(Math.random() * WEATHERS.length)];

  const data = buildLevelData(W, ngPlus);
  levelCoins = data.coins;
  levelSpikes = data.spikes;
  platformBodies = data.defs.map(createPlatformBody);

  spawnX = W / 2;
  spawnY = CONFIG.spawnY;
  peakY = spawnY;

  player = Bodies.circle(spawnX, spawnY, 14, {
    friction: 0.05,
    frictionAir: CONFIG.frictionAir,
    restitution: 0,
    label: 'player',
    // prevent player from rotating — looks weird
    inertia: Infinity,
    inverseInertia: 0,
  });

  Composite.add(world, [player, ...platformBodies]);

  // apply weather friction to all platforms
  platformBodies.forEach(b => {
    if (b.platformType && b.platformType !== 'portal' && b.platformType !== 'victory') {
      b.friction = 0.8 * window._weather.frictionMod;
    }
  });

  // reset all state
  gameStarted = false;
  timerStart = 0;
  elapsed = 0;
  deathSpinActive = false;
  deathHandling = false;
  punishCooldownUntil = Date.now() + 800;
  ghostIdx = 0;
  victoryTriggered = false;
  lastGroundedTime = Date.now();
  jumpPressedTime = 0;
  wasGrounded = false;
  landTime = 0;
  facingRight = true;
  pendingJump = false;
  canJump = true;
  currentPose = 'idle';

  Events.off(engine);
  Events.on(engine, 'beforeUpdate', onBeforeUpdate);
  Events.on(engine, 'collisionStart', onCollisionStart);
  Runner.run(runner, engine);
}

function stopGamePhysics() {
  if (runner) Runner.stop(runner);
  if (engine) {
    Events.off(engine, 'beforeUpdate', onBeforeUpdate);
    Events.off(engine, 'collisionStart', onCollisionStart);
    World.clear(world);
    Engine.clear(engine);
  }
  engine = null;
  runner = null;
  player = null;
  platformBodies = [];
  levelCoins = [];
  levelSpikes = [];
}

// ── JUMP ──────────────────────────────────────────────────────

function doJump() {
  if (!canJump) return;
  const coyoteOk = Date.now() - lastGroundedTime < CONFIG.coyoteTime;
  if (!isGrounded() && !coyoteOk) return;

  canJump = false;
  Body.setVelocity(player, { x: player.velocity.x, y: CONFIG.jumpVel });
  playJumpSound();
  spawnDust(player.position.x, player.position.y + 14, 5, 'rgba(180,150,80,0.5)');
  pendingJump = false;
  jumpPressedTime = 0;
}

// ── POSE ──────────────────────────────────────────────────────

function updateCurrentPose() {
  if (!player) return;
  const vx = player.velocity.x;
  const vy = player.velocity.y;
  const now = Date.now();

  if (deathSpinActive)                          currentPose = 'death_spin';
  else if (now - landTime < 150 && wasGrounded) currentPose = 'land';
  else if (vy < -3)                             currentPose = 'jump_up';
  else if (vy > 4)                              currentPose = 'fall_down';
  else if (Math.abs(vx) > 0.5 && wasGrounded)  currentPose = 'run';
  else                                          currentPose = 'idle';
}

// ── BEFORE UPDATE (main game tick) ───────────────────────────

function onBeforeUpdate() {
  if (typeof screen !== 'undefined' && screen !== 'game') return;
  if (deathHandling) return;

  const now = Date.now();
  const grounded = isGrounded();

  // landing detection
  if (grounded) {
    lastGroundedTime = now;
    canJump = true;
    if (!wasGrounded) {
      landTime = now;
      playLandSound();
      spawnDust(player.position.x, player.position.y + 14, 8, 'rgba(200,170,100,0.6)');
      // jump buffer — if jump was pressed just before landing, jump immediately
      if (now - jumpPressedTime < CONFIG.jumpBuffer) doJump();
    }
  }
  wasGrounded = grounded;

  // wind weather force
  if (window._weather && window._weather.windX !== 0) {
    Body.applyForce(player, player.position, { x: window._weather.windX, y: 0 });
  }

  // horizontal movement
  const force = grounded ? CONFIG.groundForce : CONFIG.airForce;

  if (keys['a'] || keys['A'] || keys['ArrowLeft']) {
    facingRight = false;
    if (player.velocity.x > -CONFIG.maxSpeed)
      Body.applyForce(player, player.position, { x: -force, y: 0 });
  }
  if (keys['d'] || keys['D'] || keys['ArrowRight']) {
    facingRight = true;
    if (player.velocity.x < CONFIG.maxSpeed)
      Body.applyForce(player, player.position, { x: force, y: 0 });
  }
  // friction when no key pressed
  if (!keys['a'] && !keys['A'] && !keys['d'] && !keys['D'] &&
      !keys['ArrowLeft'] && !keys['ArrowRight']) {
    Body.setVelocity(player, {
      x: player.velocity.x * CONFIG.damping,
      y: player.velocity.y,
    });
  }

  // coin collection
  levelCoins.forEach(coin => {
    if (coin.collected) return;
    const dx = player.position.x - coin.x;
    const dy = player.position.y - coin.y;
    if (Math.sqrt(dx * dx + dy * dy) < 22) {
      collectCoin(coin, player.position.x, player.position.y);
    }
  });

  // standalone spike bodies (from levelSpikes array)
  levelSpikes.forEach(spike => {
    if (deathSpinActive || deathHandling || now <= punishCooldownUntil) return;
    const dx = Math.abs(player.position.x - spike.x);
    const dy = player.position.y - spike.y;
    if (dx < spike.w / 2 + 8 && dy > -18 && dy < 12) {
      triggerFallPunishment();
    }
  });

  // spikes embedded on platforms
  platformBodies.forEach(p => {
    if (deathSpinActive || deathHandling || now <= punishCooldownUntil) return;
    const def = p.platformDef;
    if (!def || !def.spikes || p.broken) return;
    def.spikes.forEach(sp => {
      for (let s = 0; s < sp.count; s++) {
        const sx = p.position.x - def.w / 2 + sp.offset + s * 22 + 11;
        const sy = p.position.y - def.h / 2 - 9;
        const dx = player.position.x - sx;
        const dy = player.position.y - sy;
        if (Math.sqrt(dx * dx + dy * dy) < 18) {
          triggerFallPunishment();
        }
      }
    });
  });

  // execute buffered jump
  if (pendingJump) doJump();

  // track highest point reached this run
  if (player.position.y < peakY) peakY = player.position.y;

  // gamification per-frame update
  updateGamificationDuringPlay(
    player,
    typeof playerName !== 'undefined' ? playerName : '',
    canvas.width
  );

  // npc reactions
  const heightM = heightInMeters(player.position.y);
  updateNPCReactions(heightM, false);

  // fall punishment — fell too far below peak
  if (
    player.position.y > peakY + CONFIG.fallThreshold &&
    !deathSpinActive &&
    !deathHandling &&
    now > punishCooldownUntil
  ) {
    triggerFallPunishment();
  }

  // moving platforms
  platformBodies.forEach(p => {
    if (p.platformType !== 'moving' || p.broken) return;
    const t = now / 1000;
    const offset = Math.sin(t * Math.PI * 2 / p.movePeriod + p.movePhase) * p.moveRange / 2;
    if (p.moveAxis === 'x') Body.setPosition(p, { x: p.origX + offset, y: p.origY });
    else                    Body.setPosition(p, { x: p.origX,          y: p.origY + offset });
  });

  // start timer on first movement
  if (!gameStarted && (Math.abs(player.velocity.x) > 0.3 || Math.abs(player.velocity.y) > 0.3)) {
    gameStarted = true;
    timerStart = Date.now();
  }
  if (gameStarted) elapsed = Date.now() - timerStart;

  updateCurrentPose();
  recordGhostFrame(player.position.x, player.position.y);

  const speed = Math.abs(player.velocity.x) + Math.abs(player.velocity.y);
  updateTrail(player.position.x, player.position.y, speed);
}

// ── COLLISION ─────────────────────────────────────────────────

function onCollisionStart(e) {
  e.pairs.forEach(pair => {
    const bodies = [pair.bodyA, pair.bodyB];
    if (!bodies.includes(player)) return;
    const other = bodies[0] === player ? bodies[1] : bodies[0];
    if (!other) return;

    // near miss detection — landing close to platform edge
    if (other.platformW && !deathSpinActive && !deathHandling) {
      const edgeDist = Math.min(
        Math.abs(player.position.x - (other.position.x - other.platformW / 2)),
        Math.abs(player.position.x - (other.position.x + other.platformW / 2))
      );
      if (edgeDist < 14) {
        nearMissFlash = 2.0;
        nearMissText = NEAR_MISS_PHRASES[randInt(0, NEAR_MISS_PHRASES.length - 1)];
      }
    }

    // breakable platform — crumbles after 1.8s
    if (other.platformType === 'breakable' && !other.broken && !other.breakTimer) {
      other.breakTimer = setTimeout(() => {
        other.broken = true;
        Composite.remove(world, other);
        other.respawnTimer = setTimeout(() => {
          other.broken = false;
          other.breakTimer = null;
          Composite.add(world, other);
        }, 5000);
      }, 1800);
    }

    // spring pad — launches player high
    if (other.platformType === 'spring') {
      Body.setVelocity(player, {
        x: player.velocity.x,
        y: -22,
      });
      playSpringSound();
    }

    // speed pad — horizontal boost
    if (other.platformType === 'speed') {
      Body.setVelocity(player, {
        x: (facingRight ? 1 : -1) * 12,
        y: player.velocity.y,
      });
      playSpeedSound();
    }

    // victory platform OR portal — trigger win
    if (other.platformType === 'victory' || other.platformType === 'portal') {
      triggerVictory();
    }
  });
}

// ── DEATH & VICTORY ───────────────────────────────────────────

function triggerFallPunishment() {
  if (deathHandling) return;
  deathHandling = true;
  nearMissFlash = 0;
  deathSpinActive = true;
  deathSpinStart = Date.now();
  onDeath(typeof playerName !== 'undefined' ? playerName : '');
  onDeathCloseCall(player.position.y);
  triggerDeath(); // defined in main.js
}

function triggerVictory() {
  if (victoryTriggered) return;
  victoryTriggered = true;
  playVictorySound();
  screen = 'victory';
  addXP(200, 'VICTORY!');
  saveToLeaderboard(
    typeof playerName !== 'undefined' ? playerName : 'UNKNOWN',
    heightInMeters(player.position.y),
    elapsed
  );
  saveGhostIfBest(elapsed);
  if (runner) Runner.stop(runner);
}

// ── RESET / PAUSE / CAMERA ────────────────────────────────────

function resetPlayerPos(x, y) {
  if (!player) return;
  Body.setPosition(player, { x, y });
  Body.setVelocity(player, { x: 0, y: 0 });
  peakY = y;
  deathSpinActive = false;
  deathHandling = false;
  canJump = true;
  punishCooldownUntil = Date.now() + 1200;
}

function pausePhysics() {
  if (engine) engine.timing.timeScale = 0;
}

function resumePhysics() {
  if (engine) engine.timing.timeScale = 1;
}

function getCameraY(H) {
  if (!player) return 0;
  const cam = player.position.y - H * 0.65;
  return clamp(cam, 0, CONFIG.worldHeight - H);
}