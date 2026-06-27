// constants.js
// all the game config stuff lives here
// - Sushant

const CONFIG = {
  gravity: 0.9,
  jumpVel: -18,
  maxSpeed: 3.2,
  groundForce: 0.004,
  airForce: 0.0015,
  damping: 0.70,
  frictionAir: 0.03,
  coyoteTime: 130,
  jumpBuffer: 115,
  worldHeight: 3100,
  spawnY: 2850,
  heightBase: 2900,
  fallThreshold: 200,
  checkpoints: [2060, 1360, 500],
};

const WEATHERS = [
  { id: 'clear', label: '☀️ Clear',  frictionMod: 1.0,  windX: 0,     visibility: 1.0  },
  { id: 'rain',  label: '🌧️ Rain',   frictionMod: 0.4,  windX: 0,     visibility: 0.85 },
  { id: 'wind',  label: '💨 Wind',   frictionMod: 1.0,  windX: 0.002, visibility: 1.0  },
  { id: 'fog',   label: '🌫️ Fog',    frictionMod: 1.0,  windX: 0,     visibility: 0.0  },
];

const SKINS = [
  { id: 'ninja',   name: 'Ninja',   body: '#1a1a1a',               accent: '#FF0000', belt: '#FF0000', unlock: 'free',     unlockDesc: 'Free'        },
  { id: 'street',  name: 'Street',  body: '#1565C0',               accent: '#FFFFFF', belt: '#FFD700', unlock: 'free',     unlockDesc: 'Free'        },
  { id: 'monk',    name: 'Monk',    body: '#FF8C00',               accent: '#8B0000', belt: '#FFD700', unlock: 'height50', unlockDesc: 'Reach 50m'  },
  { id: 'ghost',   name: 'Ghost',   body: 'rgba(200,220,255,0.7)', accent: '#AAAAFF', belt: '#FFFFFF', unlock: 'deaths10', unlockDesc: 'Die 10x'    },
  { id: 'warrior', name: 'Warrior', body: '#2E7D32',               accent: '#FFD700', belt: '#8B4513', unlock: 'ng+',      unlockDesc: 'Beat NG+',   cost: 0    },
  { id: 'shadow',  name: 'Shadow',  body: '#0a0a0a',               accent: '#8B00FF', belt: '#8B00FF', unlock: 'coins',    unlockDesc: '500 coins',  cost: 500  },
  { id: 'dragon',  name: 'Dragon',  body: '#8B0000',               accent: '#FF6600', belt: '#FFD700', unlock: 'coins',    unlockDesc: '1000 coins', cost: 1000 },
];

const DEATH_QUOTES = [
  "The boulders were not impressed.",
  "Back to the street where you belong.",
  "Gravity: 1. You: 0.",
  "A masterful display of downward movement.",
  "The pigeons saw everything.",
  "Kathmandu does not care about your feelings.",
  "Physics is merciless. So am I.",
  "Was that a jump or a prayer?",
  "The rocks have seen better climbers.",
];

const TAUNTS = [
  n => n + ' fell further than you.',
  n => 'Even ' + n + ' did better.',
  n => n + ' is laughing at you right now.',
  n => n + '\'s record still stands. Embarrassing.',
  n => 'Maybe ask ' + n + ' for tips.',
];

const NEAR_MISS_PHRASES = ['NICE SAVE!', 'BY A HAIR!', 'BARELY!', 'CLUTCH!', 'NO WAY!'];

const TAGLINES = [
  '🇳🇵 Built in Kathmandu',
  '💀 10,000 deaths and counting',
  '🏆 Can you reach the top?',
  '👻 Beat your own ghost',
  '🔥 How far can YOU go?',
];

const FLOOR_CHECKPOINTS = [
  { y: 2060, floor: 1, label: '🏙️ STREET CLEARED!'  },
  { y: 1360, floor: 2, label: '🏗️ ROOFTOPS CLEARED!' },
  { y: 500,  floor: 3, label: '☁️ SKY ZONE REACHED!' },
];

const FLOOR_CHECKPOINT_YS = [
  { y: 2060, label: 'Floor 2', heightM: Math.round((2900 - 2060) / 30) },
  { y: 1360, label: 'Floor 3', heightM: Math.round((2900 - 1360) / 30) },
  { y: 500,  label: 'The Top', heightM: Math.round((2900 - 500)  / 30) },
];

const MENU_BUTTONS = [
  { id: 'play',        label: '▶ PLAY'        },
  { id: 'leaderboard', label: '🏆 LEADERBOARD' },
  { id: 'skins',       label: '👤 SKINS'       },
  { id: 'howto',       label: '❓ HOW TO PLAY' },
  { id: 'quit',        label: '✕ QUIT'         },
];

const TRAIL_TYPES = {
  none:      null,
  fire:      { colors: ['#FF4500', '#FF6B00', '#FFD700'], shape: 'circle'  },
  crystal:   { colors: ['#00BFFF', '#87CEEB', '#E0F7FA'], shape: 'diamond' },
  sakura:    { colors: ['#FFB7C5', '#FF69B4', '#FFC0CB'], shape: 'petal'   },
  lightning: { colors: ['#FFFF00', '#FFD700', '#FFA500'], shape: 'bolt'    },
};