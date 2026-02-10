import Game from './Game.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);
game.start();

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
