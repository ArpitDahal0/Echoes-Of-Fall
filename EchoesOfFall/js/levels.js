// levels.js
// platform layouts — easy floor1, medium floor2, hard floor3
// max jump reach with jumpVel=-18, gravity=0.9: ~180px vertical
// - Arpit

let platformIdCounter = 0;

function createPlatforms(W) {
  const cx = W / 2;

  // FLOOR 1 — Street (easy)
  // wide platforms, gaps 100-110px, no spikes, one breakable at end
  const floor1 = [
    { x: cx,       y: 2800, w: 320, h: 20 },              // spawn — huge
    { x: cx - 70,  y: 2690, w: 250, h: 20 },              // 110px gap
    { x: cx + 75,  y: 2580, w: 230, h: 20 },              // 110px gap
    { x: cx - 55,  y: 2472, w: 220, h: 20 },              // 108px gap
    { x: cx + 65,  y: 2365, w: 210, h: 20 },              // 107px gap
    { x: cx - 60,  y: 2260, w: 200, h: 20 },              // 105px gap
    { x: cx + 50,  y: 2155, w: 190, h: 20 },              // 105px gap
    { x: cx,       y: 2052, w: 200, h: 20, breakable: true }, // 103px — first trap
  ];

  // FLOOR 2 — Rooftops (medium)
  // narrower, gaps 100-108px, moving platform, speed pad, 1 spike cluster
  const floor2 = [
    { x: cx - 85,  y: 1950, w: 165, h: 20 },              // 102px gap from floor1
    { x: cx + 70,  y: 1845, w: 155, h: 20 },              // 105px gap
    { x: cx - 55,  y: 1740, w: 145, h: 20, spikes: [{ offset: 25, count: 2 }] }, // 105px
    { x: cx + 60,  y: 1638, w: 145, h: 20, moving: true, range: 115, speed: 1.0 }, // 102px
    { x: cx - 65,  y: 1535, w: 135, h: 20, breakable: true }, // 103px
    { x: cx + 35,  y: 1432, w: 150, h: 20, speedPad: true },  // 103px
    { x: cx,       y: 1332, w: 168, h: 20 },              // 100px — floor2 exit
  ];

  // FLOOR 3 — Sky (hard)
  // narrow, gaps 100-140px, spring shortcut, spikes, fast moving
  // spring at y:1010 launches ~160px up to y:870 platform
  const floor3 = [
    { x: cx - 70,  y: 1228, w: 128, h: 20 },                                      // 104px gap
    { x: cx + 62,  y: 1118, w: 122, h: 20, spikes: [{ offset: 12, count: 2 }] }, // 110px gap
    { x: cx - 42,  y: 1010, w: 118, h: 20, springPad: true },                    // 108px gap — spring launches up
    { x: cx + 52,  y: 870,  w: 115, h: 20, spikes: [{ offset: 18, count: 2 }] }, // spring lands here
    { x: cx - 58,  y: 768,  w: 112, h: 20, moving: true, range: 85, speed: 1.4, vertical: true }, // 102px
    { x: cx + 28,  y: 665,  w: 110, h: 20, breakable: true, spikes: [{ offset: 8, count: 2 }] }, // 103px
    { x: cx - 30,  y: 520,  w: 150, h: 20 },              // 145px gap — stepping stone added
    { x: cx,       y: 370,  w: 200, h: 20 },              // 150px gap — wide safety before victory
    { x: cx,       y: 200,  w: 370, h: 20, victory: true }, // HUGE — unmissable
  ];

  return [...floor1, ...floor2, ...floor3];
}

function createPlatformDefs(W) {
  const cx = W / 2;
  const platforms = createPlatforms(W);
  const defs = [
    { x: cx, y: 2873, w: Math.max(W, 400), h: 24, ground: true },
    ...platforms,
    { x: cx, y: 120, w: 60, h: 60, portal: true },
  ];
  window._platforms = platforms;
  return defs;
}

function createSpikes(W, ngPlus) {
  return [];
}

function createCoinsFromDefs(defs) {
  const coins = [];
  defs.forEach((p, i) => {
    if (p.ground || p.portal || p.victory) return;
    if (i % 2 === 0) {
      for (let j = 0; j < 3; j++) {
        coins.push({
          x: p.x + (j - 1) * 35,
          y: p.y - 30,
          collected: false,
          pulse: Math.random() * Math.PI * 2,
        });
      }
    }
  });
  return coins;
}

function applyNgPlusToDefs(defs) {
  defs.forEach(p => {
    if (p.ground || p.victory || p.portal) return;
    p.w = Math.max(48, p.w - 28);
  });
}

function buildLevelData(W, ngPlus) {
  platformIdCounter = 0;
  const defs = createPlatformDefs(W);
  if (ngPlus) applyNgPlusToDefs(defs);
  return {
    defs,
    spikes: createSpikes(W, ngPlus),
    coins: createCoinsFromDefs(defs),
  };
}

function defToPlatformType(p) {
  if (p.ground)    return 'ground';
  if (p.portal)    return 'portal';
  if (p.victory)   return 'victory';
  if (p.breakable) return 'breakable';
  if (p.springPad) return 'spring';
  if (p.speedPad)  return 'speed';
  if (p.moving)    return 'moving';
  return 'static';
}