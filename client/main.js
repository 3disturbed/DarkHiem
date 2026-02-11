import Game from './Game.js';
import tileSprites from './world/TileSprites.js';

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

  tileSprites.load().then(() => {
    const game = new Game(canvas);
    game.start();
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
