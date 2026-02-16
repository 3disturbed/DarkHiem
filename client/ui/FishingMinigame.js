// Stardew Valley-style fishing minigame
// Vertical bar with bouncing fish + player-controlled catch zone
// Hold click to raise zone, release to let it fall with gravity
// Progress fills when fish overlaps zone, depletes when not

const DIFFICULTY = {
  common:   { fishSpeed: 1.8, zoneSize: 0.28, targetInterval: [2.5, 4.0], fillRate: 0.35, drainRate: 0.18 },
  uncommon: { fishSpeed: 2.5, zoneSize: 0.24, targetInterval: [1.8, 3.2], fillRate: 0.30, drainRate: 0.20 },
  rare:     { fishSpeed: 3.2, zoneSize: 0.20, targetInterval: [1.2, 2.5], fillRate: 0.28, drainRate: 0.22 },
  epic:     { fishSpeed: 4.0, zoneSize: 0.16, targetInterval: [0.8, 1.8], fillRate: 0.25, drainRate: 0.25 },
};

export default class FishingMinigame {
  constructor() {
    this.active = false;
    this.fishId = null;
    this.difficulty = 'common';

    // Bar dimensions
    this.barWidth = 36;
    this.barHeight = 260;

    // Fish position (0 = top, 1 = bottom of bar)
    this.fishPos = 0.5;
    this.fishTarget = 0.5;
    this.fishVel = 0;
    this.targetTimer = 0;

    // Catch zone
    this.zonePos = 0.5;
    this.zoneSize = 0.25;
    this.zoneVel = 0;

    // Progress (0-1, starts at 0.35)
    this.progress = 0.35;

    // Difficulty params
    this.fishMaxSpeed = 1.8;
    this.targetMin = 2.5;
    this.targetMax = 4.0;
    this.fillRate = 0.35;
    this.drainRate = 0.18;

    // Callbacks
    this.onSuccess = null;
    this.onFailure = null;

    // Sparkle effect when fish is in zone
    this.sparkleTimer = 0;
  }

  start(fishId, difficulty, reelMod) {
    this.active = true;
    this.fishId = fishId;
    this.difficulty = difficulty || 'common';

    const d = DIFFICULTY[this.difficulty] || DIFFICULTY.common;
    this.fishMaxSpeed = d.fishSpeed;
    // Reel mod increases zone size (1.0 = default, 2.0 = much bigger)
    this.zoneSize = d.zoneSize * (1 + (reelMod - 1) * 0.4);
    this.zoneSize = Math.min(this.zoneSize, 0.4); // cap
    this.targetMin = d.targetInterval[0];
    this.targetMax = d.targetInterval[1];
    this.fillRate = d.fillRate;
    this.drainRate = d.drainRate;

    // Reset state
    this.fishPos = 0.5;
    this.fishTarget = Math.random();
    this.fishVel = 0;
    this.targetTimer = this.targetMin + Math.random() * (this.targetMax - this.targetMin);
    this.zonePos = 0.5;
    this.zoneVel = 0;
    this.progress = 0.35;
    this.sparkleTimer = 0;
  }

  close() {
    this.active = false;
  }

  update(dt, holding) {
    if (!this.active) return;

    // --- Fish movement ---
    this.targetTimer -= dt;
    if (this.targetTimer <= 0) {
      this.fishTarget = 0.05 + Math.random() * 0.9;
      this.targetTimer = this.targetMin + Math.random() * (this.targetMax - this.targetMin);
    }

    // Spring-damper toward target
    const diff = this.fishTarget - this.fishPos;
    this.fishVel += diff * this.fishMaxSpeed * 3.5 * dt;
    this.fishVel *= Math.pow(0.88, dt * 60); // frame-rate-independent damping
    this.fishPos += this.fishVel * dt;
    this.fishPos = Math.max(0.03, Math.min(0.97, this.fishPos));

    // --- Catch zone physics ---
    const gravity = 3.0;
    const lift = -6.0;
    if (holding) {
      this.zoneVel += lift * dt;
    } else {
      this.zoneVel += gravity * dt;
    }
    this.zoneVel *= Math.pow(0.88, dt * 60);
    this.zonePos += this.zoneVel * dt;

    // Bounce off edges
    const halfZone = this.zoneSize / 2;
    if (this.zonePos - halfZone < 0) {
      this.zonePos = halfZone;
      this.zoneVel = Math.abs(this.zoneVel) * 0.25;
    }
    if (this.zonePos + halfZone > 1) {
      this.zonePos = 1 - halfZone;
      this.zoneVel = -Math.abs(this.zoneVel) * 0.25;
    }

    // --- Progress ---
    const fishInZone = this.fishPos >= this.zonePos - halfZone &&
                       this.fishPos <= this.zonePos + halfZone;

    if (fishInZone) {
      this.progress += this.fillRate * dt;
      this.sparkleTimer += dt;
    } else {
      this.progress -= this.drainRate * dt;
      this.sparkleTimer = 0;
    }
    this.progress = Math.max(0, Math.min(1, this.progress));

    // Win / lose
    if (this.progress >= 1) {
      this.active = false;
      if (this.onSuccess) this.onSuccess();
    } else if (this.progress <= 0) {
      this.active = false;
      if (this.onFailure) this.onFailure();
    }
  }

  render(ctx, screenW, screenH) {
    if (!this.active) return;

    const barX = screenW - 80;
    const barY = (screenH - this.barHeight) / 2;
    const bw = this.barWidth;
    const bh = this.barHeight;

    // --- Outer frame ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    const pad = 10;
    const frameX = barX - pad - 22;
    const frameY = barY - pad - 24;
    const frameW = bw + pad * 2 + 22;
    const frameH = bh + pad * 2 + 40;
    ctx.beginPath();
    const r = 8;
    ctx.moveTo(frameX + r, frameY);
    ctx.lineTo(frameX + frameW - r, frameY);
    ctx.quadraticCurveTo(frameX + frameW, frameY, frameX + frameW, frameY + r);
    ctx.lineTo(frameX + frameW, frameY + frameH - r);
    ctx.quadraticCurveTo(frameX + frameW, frameY + frameH, frameX + frameW - r, frameY + frameH);
    ctx.lineTo(frameX + r, frameY + frameH);
    ctx.quadraticCurveTo(frameX, frameY + frameH, frameX, frameY + frameH - r);
    ctx.lineTo(frameX, frameY + r);
    ctx.quadraticCurveTo(frameX, frameY, frameX + r, frameY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 2;
    ctx.stroke();

    // --- Progress bar (left side) ---
    const progW = 12;
    const progX = barX - progW - 8;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(progX, barY, progW, bh);
    const fillH = this.progress * bh;
    const progColor = this.progress > 0.65 ? '#2ecc71' : this.progress > 0.3 ? '#f39c12' : '#e74c3c';
    ctx.fillStyle = progColor;
    ctx.fillRect(progX, barY + bh - fillH, progW, fillH);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(progX, barY, progW, bh);

    // --- Main fishing bar ---
    // Water gradient
    const grad = ctx.createLinearGradient(barX, barY, barX, barY + bh);
    grad.addColorStop(0, '#0d2137');
    grad.addColorStop(0.5, '#1a3a5c');
    grad.addColorStop(1, '#0d2137');
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, bw, bh);

    // Water ripple lines
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.08)';
    ctx.lineWidth = 1;
    const t = Date.now() / 1000;
    for (let i = 0; i < 8; i++) {
      const ry = barY + (bh / 8) * i + Math.sin(t * 1.5 + i) * 3;
      ctx.beginPath();
      ctx.moveTo(barX, ry);
      ctx.lineTo(barX + bw, ry);
      ctx.stroke();
    }

    // --- Catch zone ---
    const halfZone = this.zoneSize / 2;
    const zoneTop = barY + (this.zonePos - halfZone) * bh;
    const zoneH = this.zoneSize * bh;

    // Zone glow
    ctx.fillStyle = 'rgba(46, 204, 113, 0.25)';
    ctx.fillRect(barX, zoneTop - 2, bw, zoneH + 4);
    ctx.fillStyle = 'rgba(46, 204, 113, 0.45)';
    ctx.fillRect(barX, zoneTop, bw, zoneH);
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX + 1, zoneTop, bw - 2, zoneH);

    // --- Fish icon ---
    const fishY = barY + this.fishPos * bh;
    const fishX = barX + bw / 2;
    const fishInZone = this.fishPos >= this.zonePos - halfZone &&
                       this.fishPos <= this.zonePos + halfZone;

    // Sparkles when catching
    if (fishInZone && this.sparkleTimer > 0) {
      ctx.fillStyle = 'rgba(255, 255, 100, 0.6)';
      for (let i = 0; i < 3; i++) {
        const sx = fishX + Math.sin(t * 8 + i * 2.1) * 12;
        const sy = fishY + Math.cos(t * 6 + i * 1.7) * 10;
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Fish body
    const fishColor = fishInZone ? '#f1c40f' : '#e67e22';
    ctx.save();
    ctx.translate(fishX, fishY);
    // Flip based on velocity
    if (this.fishVel > 0.1) ctx.scale(1, -1);

    ctx.fillStyle = fishColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Tail
    ctx.fillStyle = fishColor;
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(15, -5);
    ctx.lineTo(15, 5);
    ctx.closePath();
    ctx.fill();

    // Dorsal fin
    ctx.beginPath();
    ctx.moveTo(-3, -5);
    ctx.lineTo(3, -9);
    ctx.lineTo(6, -5);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-4, -1, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-4, -1, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // --- Bar border ---
    ctx.strokeStyle = '#4a3a2a';
    ctx.lineWidth = 3;
    ctx.strokeRect(barX, barY, bw, bh);

    // --- Labels ---
    ctx.textAlign = 'center';
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#ddd';
    ctx.fillText('Hold Click', barX + bw / 2, barY - 12);

    // Difficulty label
    const diffColors = { common: '#aaa', uncommon: '#2ecc71', rare: '#3498db', epic: '#9b59b6' };
    ctx.fillStyle = diffColors[this.difficulty] || '#aaa';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(this.difficulty.toUpperCase(), barX + bw / 2, barY + bh + 16);
  }
}
