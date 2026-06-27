// ui.js
// screens: hall of shame, map overview, skin shop, leaderboard, donation
// - Arpit

function drawDonationBlock(W, H, y) {
  ctx.fillStyle = 'rgba(255,140,50,0.08)';
  ctx.beginPath();
  ctx.roundRect(W / 2 - 200, y, 400, 56, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,140,50,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = '8px "Press Start 2P"';
  ctx.fillStyle = '#FF8C00';
  ctx.textAlign = 'center';
  ctx.fillText('This game took 300+ hours to build 🇳🇵', W / 2, y + 18);

  drawButton(ctx, W / 2, y + 42, 220, 26, '📱 eSewa: 9817959961', '#FF8C00', () => {
    navigator.clipboard.writeText('eSewa: 9817959961 — Echoes of Fall').catch(() => {});
    spawnFloatingText('eSewa number copied!', W / 2, y, '#FF8C00');
  });
}

function drawHallOfShame(W, H) {
  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, W, H);

  ctx.font = 'bold 16px "Press Start 2P"';
  ctx.fillStyle = '#FF4444';
  ctx.textAlign = 'center';
  ctx.fillText('💀 HALL OF SHAME', W / 2, 60);

  ctx.font = '9px "Press Start 2P"';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('Your 3 worst falls this run', W / 2, 88);

  const mapW = 60, mapH = H * 0.58;
  const mapX = W / 2 - mapW / 2, mapY = H * 0.15;
  const worldH = CONFIG.worldHeight;

  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(mapX, mapY, mapW, mapH);

  if (window._platforms) {
    window._platforms.forEach(p => {
      const my = mapY + (p.y / worldH) * mapH;
      const mw = (p.w / 800) * mapW;
      ctx.fillStyle = p.victory ? '#FFD700' : '#c8a86b';
      ctx.fillRect(mapX + mapW / 2 - mw / 2, my, mw, 3);
    });
  }

  const worst = getWorstFalls();
  worst.forEach((d, i) => {
    const my = mapY + (d.y / worldH) * mapH;
    const colors = ['#FF4444', '#FF8800', '#FFCC00'];
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.fillText('💀', mapX + mapW / 2, my);
    ctx.font = '8px "Press Start 2P"';
    ctx.fillStyle = colors[i];
    ctx.textAlign = 'left';
    ctx.fillText('#' + (i + 1) + ' ' + d.height + 'm (death ' + d.num + ')', mapX + mapW + 10, my + 4);
  });

  ctx.font = '14px serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏁', mapX + mapW / 2, mapY + mapH);
  ctx.fillText('🏆', mapX + mapW / 2, mapY + 10);

  const shareText = '💀 My Hall of Shame in Echoes of Fall 🇳🇵\n' +
    worst.map((d, i) => '#' + (i + 1) + ' reached ' + d.height + 'm then died').join('\n') +
    '\n' + deaths + ' total deaths. Can you do worse?';

  drawButton(ctx, W / 2, H * 0.86, 230, 34, '📋 COPY SHAME', '#FF4444', () => {
    navigator.clipboard.writeText(shareText).catch(() => {});
    spawnFloatingText('Copied! 💀', W / 2, H * 0.82, '#FF4444');
  });

  drawButton(ctx, W / 2, H * 0.93, 150, 30, '← BACK', '#888', () => { screen = 'game'; });
}

function drawMapOverview(W, H) {
  ctx.fillStyle = 'rgba(0,0,0,0.9)';
  ctx.fillRect(0, 0, W, H);

  ctx.font = 'bold 13px "Press Start 2P"';
  ctx.fillStyle = '#FFD700';
  ctx.textAlign = 'center';
  ctx.fillText('📍 THE CLIMB', W / 2, H * 0.07);

  const mapW = 68, mapH = H * 0.64;
  const mapX = W / 2 - mapW / 2, mapY = H * 0.12;
  const worldH = CONFIG.worldHeight;

  const bgGrad = ctx.createLinearGradient(0, mapY, 0, mapY + mapH);
  bgGrad.addColorStop(0, '#0d1b2a');
  bgGrad.addColorStop(1, '#1a3a0a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(mapX, mapY, mapW, mapH);

  const zones = [
    { label: '☁️ SKY',      y: 0.15, color: '#87CEEB' },
    { label: '🏗️ ROOFTOPS', y: 0.45, color: '#FFA500' },
    { label: '🏙️ STREET',   y: 0.75, color: '#90EE90' },
  ];
  zones.forEach(z => {
    ctx.font = '7px "Press Start 2P"';
    ctx.fillStyle = z.color;
    ctx.textAlign = 'right';
    ctx.fillText(z.label, mapX - 6, mapY + mapH * z.y);
    ctx.strokeStyle = z.color + '44';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(mapX, mapY + mapH * z.y);
    ctx.lineTo(mapX + mapW, mapY + mapH * z.y);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  if (window._platforms) {
    window._platforms.forEach(p => {
      const my = mapY + (p.y / worldH) * mapH;
      const mw = Math.max(8, (p.w / 800) * mapW);
      let color = '#c8a86b';
      if (p.breakable) color = '#a05030';
      if (p.springPad) color = '#4CAF50';
      if (p.speedPad)  color = '#00BCD4';
      if (p.moving)    color = '#9C27B0';
      if (p.victory)   color = '#FFD700';
      ctx.fillStyle = color;
      ctx.fillRect(mapX + mapW / 2 - mw / 2, my - 1, mw, 3);
    });
  }

  const bestHeight = lsGet('eof_best_height', 0);
  if (bestHeight > 0) {
    const bestY = mapY + mapH - (bestHeight / 83) * mapH;
    ctx.fillStyle = '#4ade80';
    ctx.font = '9px serif';
    ctx.textAlign = 'left';
    ctx.fillText('⭐ Best: ' + bestHeight + 'm', mapX + mapW + 8, bestY);
    ctx.fillRect(mapX - 4, bestY, mapW + 8, 1);
  }

  const board = lsGet('eof_leaderboard', []);
  if (board.length > 0) {
    const topY = mapY + mapH - (board[0].height / 83) * mapH;
    ctx.fillStyle = '#FFD700';
    ctx.font = '9px serif';
    ctx.textAlign = 'left';
    ctx.fillText('🏆 ' + board[0].name + ': ' + board[0].height + 'm', mapX + mapW + 8, topY);
    ctx.fillRect(mapX - 4, topY, mapW + 8, 1);
  }

  const spawnMapY = mapY + mapH - 8;
  ctx.font = '12px serif';
  ctx.textAlign = 'center';
  ctx.fillText('🟢', mapX + mapW / 2, spawnMapY);
  ctx.font = '7px "Press Start 2P"';
  ctx.fillStyle = '#4ade80';
  ctx.fillText('YOU ARE HERE', mapX + mapW / 2, spawnMapY + 14);

  // legend
  const legend = [
    { color: '#c8a86b', label: 'Normal' },
    { color: '#a05030', label: 'Breakable' },
    { color: '#4CAF50', label: 'Spring' },
    { color: '#00BCD4', label: 'Speed' },
    { color: '#9C27B0', label: 'Moving' },
  ];
  ctx.textAlign = 'left';
  legend.forEach((l, i) => {
    const ly = mapY + mapH + 14 + i * 15;
    ctx.fillStyle = l.color;
    ctx.fillRect(mapX, ly, 10, 5);
    ctx.font = '7px "Press Start 2P"';
    ctx.fillStyle = '#fff';
    ctx.fillText(l.label, mapX + 15, ly + 5);
  });

  drawButton(ctx, W / 2, H - 24, 205, 32, '▶ START CLIMBING', '#4ade80', () => {
    fadeToBlack(() => startGame(false));
  });
}

function drawSkinsScreenUI(W, H) {
  ctx.fillStyle = 'rgba(0,0,0,0.9)';
  ctx.fillRect(0, 0, W, H);

  ctx.font = 'bold 13px "Press Start 2P"';
  ctx.fillStyle = '#e879f9';
  ctx.textAlign = 'center';
  ctx.fillText('👤 CHOOSE YOUR FIGHTER', W / 2, H * 0.07);

  // grid — 4 per row, 2 rows for 7 skins
  const cols = 4;
  const cardW = Math.floor((W - 60) / cols);
  const cardH = 150;
  const cardGap = 8;
  const totalGridW = cols * cardW;
  const gridStartX = (W - totalGridW) / 2;
  const gridStartY = H * 0.13;

  SKINS.forEach((skin, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cardX = gridStartX + col * cardW;
    const cardY = gridStartY + row * (cardH + cardGap);
    const cardCX = cardX + cardW / 2; // center x of card
    const unlocked = isSkinUnlocked(skin);
    const selected = currentSkin && currentSkin.id === skin.id;

    // card background
    ctx.fillStyle = selected ? 'rgba(192,132,252,0.22)' : 'rgba(10,5,20,0.82)';
    ctx.strokeStyle = selected ? '#e879f9' : unlocked ? '#444' : '#2a2a2a';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(cardX + 4, cardY, cardW - 8, cardH, 6);
    ctx.fill();
    ctx.stroke();

    // character or lock
    if (unlocked) {
      ctx.save();
      ctx.translate(cardCX, cardY + 48);
      drawPlayerPose(ctx, skin, 'idle');
      ctx.restore();
    } else {
      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔒', cardCX, cardY + 52);
    }

    // skin name
    ctx.font = (selected ? 'bold ' : '') + '8px "Press Start 2P"';
    ctx.fillStyle = unlocked ? '#fff' : '#555';
    ctx.textAlign = 'center';
    ctx.fillText(skin.name, cardCX, cardY + 88);

    // unlock condition — short text
    ctx.font = '7px "Press Start 2P"';
    ctx.fillStyle = skin.unlock === 'coins' ? '#FFD700' : '#777';
    ctx.fillText(skin.unlockDesc, cardCX, cardY + 104);

    // buy button for coin skins
    if (skin.unlock === 'coins' && !unlocked) {
      ctx.font = '6px "Press Start 2P"';
      ctx.fillStyle = '#FFD700';
      ctx.fillText('🪙 click to buy', cardCX, cardY + 118);
    }

    // click handler
    canvas.addEventListener('click', function skinClick(e) {
      if (screen !== 'skins') { canvas.removeEventListener('click', skinClick); return; }
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      if (mx > cardX + 4 && mx < cardX + cardW - 4 && my > cardY && my < cardY + cardH) {
        if (unlocked) {
          currentSkin = skin;
          lsSet('eof_skin', skin);
        } else if (skin.unlock === 'coins') {
          const bought = buySkinWithCoins(skin);
          if (bought) {
            spawnFloatingText('🎉 ' + skin.name + ' unlocked!', W / 2, H / 2, '#FFD700');
          } else {
            spawnFloatingText('Need ' + skin.cost + ' coins 🪙', W / 2, H / 2, '#FF4444');
          }
        }
        canvas.removeEventListener('click', skinClick);
      }
    });
  });

  // trail selector
  const trailSectionY = gridStartY + 2 * (cardH + cardGap) + 16;
  ctx.font = '8px "Press Start 2P"';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'center';
  ctx.fillText('TRAIL EFFECT', W / 2, trailSectionY);

  const trails = [
    { id: 'none',      label: 'None'    },
    { id: 'fire',      label: '🔥 Fire'  },
    { id: 'crystal',   label: '💎 Cryst' },
    { id: 'sakura',    label: '🌸 Sakura'},
    { id: 'lightning', label: '⚡ Bolt'  },
  ];
  const trailBtnW = 76;
  const trailBtnH = 24;
  const trailBtnGap = 8;
  const totalTrailW = trails.length * (trailBtnW + trailBtnGap) - trailBtnGap;
  const trailStartX = W / 2 - totalTrailW / 2 + trailBtnW / 2;
  const trailBtnY = trailSectionY + 20;

  trails.forEach((t, i) => {
    const sel = lsGet('eof_trail', 'none') === t.id;
    drawButton(ctx, trailStartX + i * (trailBtnW + trailBtnGap), trailBtnY, trailBtnW, trailBtnH,
      t.label, sel ? '#e879f9' : '#444', () => { lsSet('eof_trail', t.id); });
  });

  // esewa support — no buymeacoffee
  ctx.font = '7px "Press Start 2P"';
  ctx.fillStyle = 'rgba(255,140,50,0.75)';
  ctx.textAlign = 'center';
  ctx.fillText('Support: eSewa 9817959961', W / 2, trailBtnY + 46);

  drawButton(ctx, W / 2, H - 18, 130, 26, '← BACK', '#888', () => {
    screen = 'menu';
  });
}

function drawLeaderboardScreen(W, H) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, W, H);

  ctx.font = 'bold 14px "Press Start 2P"';
  ctx.fillStyle = '#FFD700';
  ctx.textAlign = 'center';
  ctx.fillText('🏆 LEADERBOARD', W / 2, H * 0.09);

  const board = lsGet('eof_leaderboard', []);

  if (board.length === 0) {
    ctx.font = '9px "Press Start 2P"';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('No runs yet — go climb!', W / 2, H * 0.44);
  } else {
    board.slice(0, 5).forEach((entry, i) => {
      const entryTop = H * 0.19 + i * 58;
      const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i];

      ctx.font = '10px "Press Start 2P"';
      ctx.fillStyle = i === 0 ? '#FFD700' : '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(medal + '  ' + entry.name, W / 2, entryTop + 14);

      ctx.font = '8px "Press Start 2P"';
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText(
        entry.height + 'm  |  ' + formatTime(entry.time) + '  |  ' + entry.date,
        W / 2, entryTop + 30
      );

      if (entry.prestige > 0) {
        ctx.fillStyle = '#FF8C00';
        ctx.fillText('👑 Prestige ' + entry.prestige, W / 2, entryTop + 46);
      }
    });
  }

  // no friend code input — removed
  drawButton(ctx, W / 2, H - 34, 140, 26, '← BACK', '#888', () => {
    screen = 'menu';
  });
}