import { PLAYER_SIZE } from '../../shared/Constants.js';
import stationSprites from './StationSprites.js';
import enemySprites, { ANIMATED_SPRITES, getAnimMeta } from './EnemySprites.js';
import npcSprites from './NPCSprites.js';
import playerSprites from './PlayerSprites.js';

export default class EntityRenderer {
  // Render a player entity
  static renderPlayer(r, x, y, color, name, hp, maxHp, isLocal, facingX, facingY, isMoving) {
    const half = PLAYER_SIZE / 2;
    const ctx = r.ctx;

    // Try sprite first
    const frameIndex = (isMoving && playerSprites.frameCount > 1)
      ? Math.floor((Date.now() / 200) % playerSprites.frameCount)
      : 0;
    const frameData = playerSprites.getFrame(color, frameIndex);
    if (frameData) {
      ctx.drawImage(frameData.sheet, frameData.sx, frameData.sy, frameData.sw, frameData.sh,
        Math.round(x - half), Math.round(y - half), PLAYER_SIZE, PLAYER_SIZE);
    } else {
      // Fallback: colored square
      r.drawRect(x - half, y - half, PLAYER_SIZE, PLAYER_SIZE, color);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.round(x - half), Math.round(y - half), PLAYER_SIZE, PLAYER_SIZE);
    }

    // Direction indicator for local player
    if (isLocal) {
      r.drawCircle(
        x + facingX * half * 0.6,
        y + facingY * half * 0.6,
        4, '#fff'
      );
    }

    // Name tag
    r.drawText(name, x, y - half - 12, '#fff', 10 * r.uiScale, 'center');

    // Health bar (only show if damaged)
    if (hp < maxHp && maxHp > 0) {
      EntityRenderer.renderHealthBar(r, x, y - half - 4, 28, 3, hp, maxHp, '#2ecc71');
    }
  }

  // Render an enemy entity
  static renderEnemy(r, x, y, color, size, name, hp, maxHp, aiState, isBoss = false, enemyId = null, facingRight = false) {
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

    // Try sprite first
    const sprite = enemyId ? enemySprites.get(enemyId) : null;
    if (sprite) {
      const animMeta = getAnimMeta(sprite);
      const dx = Math.round(x - half);
      const dy = Math.round(y - half);
      if (animMeta) {
        // Animated sprite sheet: animate when moving, freeze frame 0 when still
        const isMoving = aiState === 'patrol' || aiState === 'chase' || aiState === 'flee';
        const frame = isMoving ? Math.floor((Date.now() / 150) % animMeta.frames) : 0;
        const sx = frame * animMeta.frameWidth;
        if (facingRight) {
          ctx.save();
          ctx.translate(Math.round(x), 0);
          ctx.scale(-1, 1);
          ctx.drawImage(sprite, sx, 0, animMeta.frameWidth, animMeta.frameHeight,
            -half, dy, size, size);
          ctx.restore();
        } else {
          ctx.drawImage(sprite, sx, 0, animMeta.frameWidth, animMeta.frameHeight,
            dx, dy, size, size);
        }
      } else {
        // Single-frame sprite
        ctx.drawImage(sprite, dx, dy, size, size);
      }
    } else {
      // Fallback: colored rectangle
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
    }

    // Name tag — gold for boss
    if (isBoss) {
      r.drawText(name, x, y - half - 18, '#ffd700', 12 * r.uiScale, 'center');
    } else {
      r.drawText(name, x, y - half - 12, '#ddd', 9 * r.uiScale, 'center');
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
    r.drawText(name, x, y - half - 12, '#c8d6e5', 8 * r.uiScale, 'center');

    // Health bar (only show if damaged)
    if (hp < maxHp && maxHp > 0) {
      EntityRenderer.renderHealthBar(r, x, y - half - 4, Math.max(size, 24), 3, hp, maxHp, '#f39c12');
    }
  }

  // Render a crafting station entity
  static renderStation(r, x, y, color, size, name, level, stationId) {
    const half = size / 2;
    const ctx = r.ctx;

    // Try sprite first
    const sprite = stationId ? stationSprites.get(stationId) : null;
    if (sprite) {
      ctx.drawImage(sprite, Math.round(x - half), Math.round(y - half), size, size);
    } else {
      // Fallback: diamond shape
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(Math.round(x), Math.round(y - half));
      ctx.lineTo(Math.round(x + half), Math.round(y));
      ctx.lineTo(Math.round(x), Math.round(y + half));
      ctx.lineTo(Math.round(x - half), Math.round(y));
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Name tag (show level if > 1)
    const label = level > 1 ? `${name} Lv${level}` : name;
    r.drawText(label, x, y - half - 8, '#ffd700', 9 * r.uiScale, 'center');
  }

  // Render a chest entity
  static renderChest(r, x, y, color, size, name, stationId) {
    const ctx = r.ctx;
    const half = size / 2;

    // Try sprite first
    const sprite = stationId ? stationSprites.get(stationId) : null;
    if (sprite) {
      ctx.drawImage(sprite, Math.round(x - half), Math.round(y - half), size, size);
    } else {
      // Fallback: box shape
      const w = size;
      const h = size * 0.7;

      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x - w / 2), Math.round(y - h / 2), w, h);

      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(Math.round(x - w / 2), Math.round(y - h / 2), w, h * 0.35);

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.round(x - w / 2), Math.round(y - h / 2), w, h);

      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(Math.round(x - 3), Math.round(y - h / 2 + h * 0.3), 6, 6);
    }

    // Name tag
    r.drawText(name, x, y - half - 8, '#ffd700', 9 * r.uiScale, 'center');
  }

  // Render a summoning shrine/altar
  static renderAltar(r, x, y, color, size, name, isActive, stationId) {
    const half = size / 2;
    const ctx = r.ctx;

    // Pulsing glow (always shown, even with sprite)
    const pulse = isActive
      ? 0.2 + Math.sin(Date.now() / 600) * 0.1
      : 0.4 + Math.sin(Date.now() / 300) * 0.2;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = isActive ? '#e74c3c' : '#B87333';
    ctx.beginPath();
    ctx.arc(Math.round(x), Math.round(y), half + 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Try sprite first
    const sprite = stationId ? stationSprites.get(stationId) : null;
    if (sprite) {
      ctx.drawImage(sprite, Math.round(x - half), Math.round(y - half), size, size);
    } else {
      // Fallback: octagon body
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i / 8) - Math.PI / 8;
        const px = x + Math.cos(angle) * half;
        const py = y + Math.sin(angle) * half;
        if (i === 0) ctx.moveTo(Math.round(px), Math.round(py));
        else ctx.lineTo(Math.round(px), Math.round(py));
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = isActive ? '#e74c3c' : '#ffd700';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Name tag
    r.drawText(name, x, y - half - 12, '#ffd700', 11 * r.uiScale, 'center');

    // Status hint
    const status = isActive ? 'Boss Active' : 'Press E';
    r.drawText(status, x, y + half + 14, isActive ? '#e74c3c' : '#aaa', 8 * r.uiScale, 'center');
  }

  // Render an NPC entity
  static renderNPC(r, x, y, color, size, name, npcType) {
    const half = size / 2;
    const ctx = r.ctx;

    // Try sprite first
    const sprite = npcType ? npcSprites.get(npcType) : null;
    if (sprite) {
      ctx.drawImage(sprite, Math.round(x - half), Math.round(y - half), size, size);
    } else {
      // Fallback: hexagonal body shape
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i / 6) - Math.PI / 6;
        const px = x + Math.cos(angle) * half;
        const py = y + Math.sin(angle) * half;
        if (i === 0) ctx.moveTo(Math.round(px), Math.round(py));
        else ctx.lineTo(Math.round(px), Math.round(py));
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Name tag
    r.drawText(name, x, y - half - 14, '#fff', 10 * r.uiScale, 'center');

    // Citizens: no type indicator, no "Press E"
    if (npcType === 'citizen') return;

    // Type indicator above name
    if (npcType === 'quest_giver') {
      // Yellow exclamation mark
      r.drawText('!', x, y - half - 26, '#ffd700', 16 * r.uiScale, 'center');
    } else if (npcType === 'vendor') {
      // Gold coin symbol
      r.drawText('$', x, y - half - 26, '#f1c40f', 14 * r.uiScale, 'center');
    } else if (npcType === 'guard') {
      // Shield indicator - blue outline around body
      ctx.strokeStyle = '#3498db';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(Math.round(x), Math.round(y), half + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // "Press E" hint
    if (npcType !== 'guard') {
      r.drawText('Press E', x, y + half + 10, '#aaa', 7 * r.uiScale, 'center');
    }
  }

  // Render a ghost station for placement preview
  static renderStationGhost(r, x, y, color, size, name, isValid, stationId) {
    const half = size / 2;
    const ctx = r.ctx;

    ctx.save();
    ctx.globalAlpha = 0.5;

    // Try sprite first
    const sprite = stationId ? stationSprites.get(stationId) : null;
    if (sprite) {
      ctx.drawImage(sprite, Math.round(x - half), Math.round(y - half), size, size);
    } else {
      // Fallback: diamond shape
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(Math.round(x), Math.round(y - half));
      ctx.lineTo(Math.round(x + half), Math.round(y));
      ctx.lineTo(Math.round(x), Math.round(y + half));
      ctx.lineTo(Math.round(x - half), Math.round(y));
      ctx.closePath();
      ctx.fill();
    }

    // Outline: green if valid, red if invalid
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = isValid ? '#2ecc71' : '#e74c3c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(Math.round(x - half), Math.round(y - half), size, size);
    ctx.stroke();

    // Name tag
    ctx.globalAlpha = 0.7;
    r.drawText(name, x, y - half - 8, isValid ? '#2ecc71' : '#e74c3c', 9 * r.uiScale, 'center');

    ctx.restore();
  }

  static renderHorse(r, x, y, color, size, name, tamed, ownerId, isMoving, facingRight) {
    const half = size / 2;
    const ctx = r.ctx;

    // Try sprite first (reuse enemy sprites loader)
    const sprite = enemySprites.get('wild_horse');
    if (sprite) {
      const animMeta = ANIMATED_SPRITES['wild_horse'];
      const frame = (isMoving && animMeta) ? Math.floor((Date.now() / 150) % animMeta.frames) : 0;
      const sx = animMeta ? frame * animMeta.frameWidth : 0;
      const sw = animMeta ? animMeta.frameWidth : sprite.width;
      const sh = animMeta ? animMeta.frameHeight : sprite.height;
      const dx = Math.round(x - half);
      const dy = Math.round(y - half);
      if (facingRight) {
        ctx.save();
        ctx.translate(Math.round(x), 0);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, sx, 0, sw, sh, -half, dy, size, size);
        ctx.restore();
      } else {
        ctx.drawImage(sprite, sx, 0, sw, sh, dx, dy, size, size);
      }
    } else {
      // Fallback: rounded brown body
      ctx.fillStyle = color || '#8B6C42';
      ctx.beginPath();
      const rx = Math.round(x - half);
      const ry = Math.round(y - half * 0.7);
      const w = size;
      const h = size * 0.7;
      const rad = 4;
      ctx.moveTo(rx + rad, ry);
      ctx.lineTo(rx + w - rad, ry);
      ctx.quadraticCurveTo(rx + w, ry, rx + w, ry + rad);
      ctx.lineTo(rx + w, ry + h - rad);
      ctx.quadraticCurveTo(rx + w, ry + h, rx + w - rad, ry + h);
      ctx.lineTo(rx + rad, ry + h);
      ctx.quadraticCurveTo(rx, ry + h, rx, ry + h - rad);
      ctx.lineTo(rx, ry + rad);
      ctx.quadraticCurveTo(rx, ry, rx + rad, ry);
      ctx.closePath();
      ctx.fill();

      // Legs
      ctx.fillStyle = '#6B4C22';
      ctx.fillRect(Math.round(x - half * 0.6), Math.round(y + half * 0.3), 3, half * 0.6);
      ctx.fillRect(Math.round(x + half * 0.3), Math.round(y + half * 0.3), 3, half * 0.6);

      // Outline
      ctx.strokeStyle = tamed ? '#ffd700' : '#000';
      ctx.lineWidth = tamed ? 2 : 1;
      ctx.strokeRect(Math.round(x - half), Math.round(y - half), size, size);
    }

    // Tamed indicator: golden outline
    if (tamed && sprite) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.round(x - half - 1), Math.round(y - half - 1), size + 2, size + 2);
    }

    // Name tag
    const nameColor = tamed ? '#90ee90' : '#ddd';
    r.drawText(name, x, y - half - 10, nameColor, 9 * r.uiScale, 'center');
  }

  // Render a projectile entity (arrow or magic bolt)
  static renderProjectile(r, x, y, vx, vy, projectileType) {
    const ctx = r.ctx;

    // Calculate rotation angle from velocity
    const angle = Math.atan2(vy, vx);

    if (projectileType === 'arrow') {
      // Arrow: rotated elongated triangle + shaft line
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      ctx.rotate(angle);

      // Shaft
      ctx.strokeStyle = '#8B6914';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(4, 0);
      ctx.stroke();

      // Arrowhead
      ctx.fillStyle = '#aaa';
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(2, -3);
      ctx.lineTo(2, 3);
      ctx.closePath();
      ctx.fill();

      // Fletching
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-7, -3);
      ctx.lineTo(-7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-7, 3);
      ctx.lineTo(-7, 0);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    } else {
      // Magic bolt: colored circle with glow aura
      const colors = {
        fire_bolt: '#e74c3c',
        ice_bolt: '#3498db',
        lightning_bolt: '#f1c40f',
        nature_bolt: '#2ecc71',
      };
      const color = colors[projectileType] || '#9b59b6';

      // Glow aura
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(Math.round(x), Math.round(y), 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Core
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(Math.round(x), Math.round(y), 4, 0, Math.PI * 2);
      ctx.fill();

      // Bright center
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(Math.round(x), Math.round(y), 2, 0, Math.PI * 2);
      ctx.fill();
    }
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
