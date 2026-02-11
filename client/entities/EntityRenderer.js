import { PLAYER_SIZE } from '../../shared/Constants.js';

export default class EntityRenderer {
  // Render a player entity
  static renderPlayer(r, x, y, color, name, hp, maxHp, isLocal, facingX, facingY) {
    const half = PLAYER_SIZE / 2;

    // Body
    r.drawRect(x - half, y - half, PLAYER_SIZE, PLAYER_SIZE, color);
    r.ctx.strokeStyle = '#000';
    r.ctx.lineWidth = 2;
    r.ctx.strokeRect(Math.round(x - half), Math.round(y - half), PLAYER_SIZE, PLAYER_SIZE);

    // Direction indicator for local player
    if (isLocal) {
      r.drawCircle(
        x + facingX * half * 0.6,
        y + facingY * half * 0.6,
        4, '#fff'
      );
    }

    // Name tag
    r.drawText(name, x, y - half - 12, '#fff', 10, 'center');

    // Health bar (only show if damaged)
    if (hp < maxHp && maxHp > 0) {
      EntityRenderer.renderHealthBar(r, x, y - half - 4, 28, 3, hp, maxHp, '#2ecc71');
    }
  }

  // Render an enemy entity
  static renderEnemy(r, x, y, color, size, name, hp, maxHp, aiState, isBoss = false) {
    const half = size / 2;
    const ctx = r.ctx;

    // Boss: pulsing copper glow behind entity
    if (isBoss) {
      const pulse = 0.4 + Math.sin(Date.now() / 400) * 0.15;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#B87333';
      ctx.beginPath();
      ctx.arc(Math.round(x), Math.round(y), half + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Body
    r.drawRect(x - half, y - half, size, size, color);

    // Outline - red if aggro, gold for boss
    if (isBoss) {
      ctx.strokeStyle = (aiState === 'chase' || aiState === 'attack') ? '#ff4444' : '#ffd700';
      ctx.lineWidth = 3;
    } else {
      ctx.strokeStyle = (aiState === 'chase' || aiState === 'attack') ? '#ff0000' : '#000';
      ctx.lineWidth = (aiState === 'chase' || aiState === 'attack') ? 2 : 1;
    }
    ctx.strokeRect(Math.round(x - half), Math.round(y - half), size, size);

    // Name tag — gold for boss
    if (isBoss) {
      r.drawText(name, x, y - half - 18, '#ffd700', 12, 'center');
    } else {
      r.drawText(name, x, y - half - 12, '#ddd', 9, 'center');
    }

    // Health bar — wider and copper-tinted for boss
    if (maxHp > 0) {
      if (isBoss) {
        EntityRenderer.renderHealthBar(r, x, y - half - 8, Math.max(size + 16, 56), 5, hp, maxHp, '#B87333');
      } else {
        EntityRenderer.renderHealthBar(r, x, y - half - 4, Math.max(size, 28), 3, hp, maxHp, '#e74c3c');
      }
    }
  }

  // Render a resource node entity
  static renderResource(r, x, y, color, size, name, hp, maxHp) {
    const half = size / 2;

    // Body (circle shape to distinguish from enemies)
    r.drawCircle(x, y, half, color);

    // Outline
    r.ctx.strokeStyle = '#000';
    r.ctx.lineWidth = 1;
    r.ctx.beginPath();
    r.ctx.arc(Math.round(x), Math.round(y), half, 0, Math.PI * 2);
    r.ctx.stroke();

    // Name tag
    r.drawText(name, x, y - half - 12, '#c8d6e5', 8, 'center');

    // Health bar (only show if damaged)
    if (hp < maxHp && maxHp > 0) {
      EntityRenderer.renderHealthBar(r, x, y - half - 4, Math.max(size, 24), 3, hp, maxHp, '#f39c12');
    }
  }

  // Render a crafting station entity
  static renderStation(r, x, y, color, size, name, level) {
    const half = size / 2;

    // Body (diamond shape to distinguish)
    const ctx = r.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(Math.round(x), Math.round(y - half));
    ctx.lineTo(Math.round(x + half), Math.round(y));
    ctx.lineTo(Math.round(x), Math.round(y + half));
    ctx.lineTo(Math.round(x - half), Math.round(y));
    ctx.closePath();
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Name tag (show level if > 1)
    const label = level > 1 ? `${name} Lv${level}` : name;
    r.drawText(label, x, y - half - 8, '#ffd700', 9, 'center');
  }

  // Render a ghost station for placement preview
  static renderStationGhost(r, x, y, color, size, name, isValid) {
    const half = size / 2;
    const ctx = r.ctx;

    ctx.save();
    ctx.globalAlpha = 0.5;

    // Body (diamond shape, same as renderStation)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(Math.round(x), Math.round(y - half));
    ctx.lineTo(Math.round(x + half), Math.round(y));
    ctx.lineTo(Math.round(x), Math.round(y + half));
    ctx.lineTo(Math.round(x - half), Math.round(y));
    ctx.closePath();
    ctx.fill();

    // Outline: green if valid, red if invalid
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = isValid ? '#2ecc71' : '#e74c3c';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Name tag
    ctx.globalAlpha = 0.7;
    r.drawText(name, x, y - half - 8, isValid ? '#2ecc71' : '#e74c3c', 9, 'center');

    ctx.restore();
  }

  static renderHealthBar(r, cx, y, width, height, current, max, color) {
    const x = cx - width / 2;
    const pct = Math.max(0, current / max);

    // Background
    r.ctx.fillStyle = '#333';
    r.ctx.fillRect(Math.round(x), Math.round(y), width, height);

    // Fill
    r.ctx.fillStyle = color;
    r.ctx.fillRect(Math.round(x), Math.round(y), Math.round(width * pct), height);

    // Border
    r.ctx.strokeStyle = '#000';
    r.ctx.lineWidth = 1;
    r.ctx.strokeRect(Math.round(x), Math.round(y), width, height);
  }
}
