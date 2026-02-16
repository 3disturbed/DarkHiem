const FRAME_W = 32;
const FRAME_H = 32;

class PlayerSprites {
  constructor() {
    this.baseSprite = null;
    this.tintCache = {};
    this.loaded = false;
    this.frameCount = 1;
  }

  load() {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.baseSprite = img;
        this.frameCount = Math.max(1, Math.floor(img.width / FRAME_W));
        this.loaded = true;
        resolve();
      };
      img.onerror = () => {
        this.loaded = true;
        resolve();
      };
      img.src = '/tileArt/player.png';
    });
  }

  getTinted(color) {
    if (!this.baseSprite) return null;
    if (this.tintCache[color]) return this.tintCache[color];

    const w = this.baseSprite.width;
    const h = this.baseSprite.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Draw base sprite sheet
    ctx.drawImage(this.baseSprite, 0, 0);

    // Tint non-transparent pixels with player color
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);

    this.tintCache[color] = canvas;
    return canvas;
  }

  getFrame(color, frameIndex) {
    const sheet = this.getTinted(color);
    if (!sheet) return null;
    const frame = Math.min(frameIndex, this.frameCount - 1);
    return { sheet, sx: frame * FRAME_W, sy: 0, sw: FRAME_W, sh: FRAME_H };
  }
}

const playerSprites = new PlayerSprites();
export default playerSprites;
