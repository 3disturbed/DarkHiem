import Game from './Game.js';
import tileSprites from './world/TileSprites.js';
import stationSprites from './entities/StationSprites.js';
import enemySprites from './entities/EnemySprites.js';
import npcSprites from './entities/NPCSprites.js';
import playerSprites from './entities/PlayerSprites.js';
import skillSprites from './entities/SkillSprites.js';
import itemSprites from './entities/ItemSprites.js';

// Check for valid session before loading game
const token = localStorage.getItem('darkheim_token');
const characterId = localStorage.getItem('darkheim_character_id');

if (token && characterId) {
  // Validate session with server before loading
  fetch('/api/session', {
    headers: { 'Authorization': `Bearer ${token}` },
  })
    .then(res => res.json())
    .then(data => {
      if (data.valid) {
        startGame();
      } else {
        redirectToLanding();
      }
    })
    .catch(() => {
      // If session check fails, still try to start (server might be the same instance)
      startGame();
    });
} else if (localStorage.getItem('darkheim_player_id')) {
  // Legacy player with old-style ID: let them play without auth
  startGame();
} else {
  redirectToLanding();
}

function redirectToLanding() {
  localStorage.removeItem('darkheim_token');
  localStorage.removeItem('darkheim_character_id');
  window.location.href = '/';
}

function startGame() {
  const canvas = document.getElementById('game');
  const splashBar = document.getElementById('splash-bar');
  const splashText = document.getElementById('splash-text');
  const splash = document.getElementById('splash');

  // Track sprite loading progress
  const loaders = [
    { name: 'Tiles', fn: () => tileSprites.load() },
    { name: 'Stations', fn: () => stationSprites.load() },
    { name: 'Enemies', fn: () => enemySprites.load() },
    { name: 'NPCs', fn: () => npcSprites.load() },
    { name: 'Players', fn: () => playerSprites.load() },
    { name: 'Skills', fn: () => skillSprites.load() },
    { name: 'Items', fn: () => itemSprites.load() },
  ];

  let loaded = 0;
  const total = loaders.length;

  Promise.all(loaders.map(l =>
    l.fn().then(() => {
      loaded++;
      const pct = Math.round((loaded / total) * 100);
      if (splashBar) splashBar.style.width = pct + '%';
      if (splashText) splashText.textContent = `Loading ${l.name}... ${pct}%`;
    })
  )).then(() => {
    if (splashText) splashText.textContent = 'Starting...';
    const game = new Game(canvas);
    game.start();
    // Fade out splash
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => splash.remove(), 700);
    }
  });

  // Fullscreen button for mobile - only show on touch devices when not fullscreen
  const fsBtn = document.getElementById('fullscreen-btn');
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  function updateFullscreenBtn() {
    const isFullscreen = !!document.fullscreenElement;
    fsBtn.style.display = (isTouchDevice && !isFullscreen) ? 'block' : 'none';
  }

  if (isTouchDevice && document.documentElement.requestFullscreen) {
    fsBtn.addEventListener('click', () => {
      document.documentElement.requestFullscreen().catch(() => {});
    });
    document.addEventListener('fullscreenchange', updateFullscreenBtn);
    updateFullscreenBtn();
  }
}
