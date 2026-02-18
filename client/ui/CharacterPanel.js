import uiSprites from './UISprites.js';

const BASE_W = 520;
const BASE_H = 440;
const HEADER_H = 30;
const TAB_BAR_H = 36;
const CONTENT_Y_OFFSET = HEADER_H + TAB_BAR_H;
const TAB_ICON_SIZE = 20;

const TABS = [
  { id: 'inventory', label: 'Inventory', iconId: 'inventory' },
  { id: 'character', label: 'Character', iconId: 'tabCharacter' },
];

export default class CharacterPanel {
  constructor(inventoryContent, characterContent) {
    this.visible = false;
    this.activeTab = 0; // 0 = inventory, 1 = character

    this.x = 0;
    this.y = 0;
    this.width = BASE_W;
    this.height = BASE_H;

    // Animation
    this.openProgress = 0;       // 0..1 for open/close
    this.tabSlide = 0;           // current slide offset (-1..0..1)
    this.tabSlideTarget = 0;
    this.prevTab = 0;

    // Focus tracking for controller
    this.focusZone = 'content'; // 'tabs' | 'content'

    // Sub-content panels
    this.inventoryContent = inventoryContent;
    this.characterContent = characterContent;

    // Track canvas size for responsive
    this._canvasW = 520;
    this._canvasH = 440;
  }

  open() {
    this.visible = true;
    this.activeTab = 0;
    this.focusZone = 'content';
    this.tabSlide = 0;
    this.tabSlideTarget = 0;
    this.prevTab = 0;
  }

  close() {
    this.visible = false;
    this.openProgress = 0;
  }

  toggle() {
    if (this.visible) {
      this.close();
    } else {
      this.open();
    }
    return this.visible;
  }

  position(canvasWidth, canvasHeight) {
    this._canvasW = canvasWidth;
    this._canvasH = canvasHeight;

    const isPhone = canvasWidth < 400;
    const isSmall = canvasWidth < BASE_W + 20;

    if (isPhone) {
      this.width = canvasWidth - 8;
      this.height = Math.min(BASE_H, canvasHeight - 16);
    } else if (isSmall) {
      this.width = canvasWidth - 16;
      this.height = Math.min(BASE_H, canvasHeight - 40);
    } else {
      this.width = BASE_W;
      this.height = BASE_H;
    }

    this.x = Math.max(4, (canvasWidth - this.width) / 2);
    this.y = Math.max(4, (canvasHeight - this.height) / 2 + 10);

    // Propagate content area to children
    this._updateContentAreas();
  }

  _updateContentAreas() {
    const area = {
      x: this.x,
      y: this.y + CONTENT_Y_OFFSET,
      width: this.width,
      height: this.height - CONTENT_Y_OFFSET,
    };
    this.inventoryContent.setContentArea(area);
    this.characterContent.setContentArea(area);
  }

  switchTab(index) {
    if (index < 0 || index >= TABS.length || index === this.activeTab) return;
    this.prevTab = this.activeTab;
    this.tabSlideTarget = index > this.activeTab ? 1 : -1;
    this.tabSlide = 0;
    this.activeTab = index;
    this.focusZone = 'content';
  }

  handleTabSwitch(direction) {
    const next = this.activeTab + direction;
    if (next >= 0 && next < TABS.length) {
      this.switchTab(next);
    }
  }

  update(dt) {
    // Open/close animation
    if (this.visible && this.openProgress < 1) {
      this.openProgress = Math.min(1, this.openProgress + dt * 8);
    } else if (!this.visible && this.openProgress > 0) {
      this.openProgress = Math.max(0, this.openProgress - dt * 10);
    }

    // Tab slide animation
    if (this.tabSlideTarget !== 0) {
      this.tabSlide += this.tabSlideTarget * dt * 10;
      if (Math.abs(this.tabSlide) >= 1) {
        this.tabSlide = 0;
        this.tabSlideTarget = 0;
      }
    }
  }

  handleClick(mx, my, inventory, equipment, playerStats, onEquip, onUse, onDrop, onSwap, onUnequip, onAllocate) {
    if (!this.visible || this.openProgress < 0.5) return false;

    // Outside panel -> close
    if (mx < this.x || mx > this.x + this.width ||
        my < this.y || my > this.y + this.height) {
      return 'close';
    }

    // Close button (top-right)
    if (mx >= this.x + this.width - 32 && mx <= this.x + this.width - 6 &&
        my >= this.y + 4 && my < this.y + HEADER_H) {
      return 'close';
    }

    // Tab bar clicks
    const tabY = this.y + HEADER_H;
    if (my >= tabY && my < tabY + TAB_BAR_H) {
      const tabW = this.width / TABS.length;
      for (let i = 0; i < TABS.length; i++) {
        const tx = this.x + i * tabW;
        if (mx >= tx && mx < tx + tabW) {
          this.switchTab(i);
          return true;
        }
      }
      return true;
    }

    // Delegate to active tab content
    if (this.activeTab === 0) {
      return this.inventoryContent.handleClick(mx, my, inventory, onEquip, onUse, onDrop, onSwap);
    } else {
      return this.characterContent.handleClick(mx, my, equipment, playerStats, onUnequip, onAllocate);
    }
  }

  handleRightClick(mx, my, inventory) {
    if (!this.visible || this.activeTab !== 0) return null;
    return this.inventoryContent.handleRightClick(mx, my, inventory);
  }

  handleScroll(delta) {
    if (!this.visible) return false;
    if (this.activeTab === 0) {
      return this.inventoryContent.handleScroll(delta);
    } else {
      return this.characterContent.handleScroll(delta);
    }
  }

  handleMouseMove(mx, my) {
    if (!this.visible) return;
    if (this.activeTab === 0) {
      this.inventoryContent.handleMouseMove(mx, my);
    } else {
      this.characterContent.handleMouseMove(mx, my);
    }
  }

  selectDir(dx, dy) {
    if (this.focusZone === 'tabs') {
      if (dx !== 0) {
        // Switch tabs with left/right
        this.handleTabSwitch(dx);
      }
      if (dy > 0) {
        // Enter content zone
        this.focusZone = 'content';
      }
    } else {
      // Delegate to active content
      if (this.activeTab === 0) {
        // For inventory, dpad up at top returns to tabs
        if (dy < 0 && this.inventoryContent.selectedItemIndex <= 0 && this.inventoryContent.selectedCategory === 0) {
          // Don't go to tabs zone on inventory since tab switching is fine with content
          // Just delegate normally
        }
        this.inventoryContent.selectDir(dx, dy);
      } else {
        this.characterContent.selectDir(dx, dy);
      }
    }
  }

  confirmSelected(inventory, equipment, playerStats, onEquip, onUse, onUnequip, onAllocate) {
    if (this.activeTab === 0) {
      this.inventoryContent.confirmSelected(inventory, onEquip, onUse);
    } else {
      this.characterContent.confirmSelected(equipment, playerStats, onUnequip, onAllocate);
    }
  }

  dropSelected(inventory, onDrop) {
    if (this.activeTab === 0) {
      this.inventoryContent.dropSelected(inventory, onDrop);
    }
  }

  render(ctx, inventory, equipment, playerStats) {
    if (this.openProgress <= 0) return;

    ctx.save();

    // Open/close animation: scale + fade
    const p = this.openProgress;
    const scale = 0.92 + 0.08 * p;
    ctx.globalAlpha = p;

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);

    // Panel background with rounded corners
    ctx.fillStyle = 'rgba(10, 10, 20, 0.96)';
    this._roundRect(ctx, this.x, this.y, this.width, this.height, 6);
    ctx.fill();

    // Outer gold accent border
    ctx.strokeStyle = 'rgba(201, 168, 76, 0.25)';
    ctx.lineWidth = 1;
    this._roundRect(ctx, this.x, this.y, this.width, this.height, 6);
    ctx.stroke();

    // Inner border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    this._roundRect(ctx, this.x + 1, this.y + 1, this.width - 2, this.height - 2, 5);
    ctx.stroke();

    // Header
    this._renderHeader(ctx);

    // Tab bar
    this._renderTabBar(ctx);

    // Content area with clip
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x + 1, this.y + CONTENT_Y_OFFSET, this.width - 2, this.height - CONTENT_Y_OFFSET - 1);
    ctx.clip();

    // Content background
    ctx.fillStyle = '#0c0c18';
    ctx.fillRect(this.x + 1, this.y + CONTENT_Y_OFFSET, this.width - 2, this.height - CONTENT_Y_OFFSET - 1);

    // Render active tab with slide animation
    if (this.tabSlideTarget !== 0 && Math.abs(this.tabSlide) < 1) {
      // Sliding: render both old and new content
      const slideOffset = this.tabSlide * this.width;
      const enterDir = this.tabSlideTarget > 0 ? 1 : -1;

      // Outgoing content (previous tab)
      ctx.save();
      ctx.translate(-slideOffset, 0);
      if (this.prevTab === 0) {
        this.inventoryContent.render(ctx, inventory);
      } else {
        this.characterContent.render(ctx, equipment, playerStats);
      }
      ctx.restore();

      // Incoming content (new tab)
      ctx.save();
      ctx.translate(enterDir * this.width - slideOffset, 0);
      if (this.activeTab === 0) {
        this.inventoryContent.render(ctx, inventory);
      } else {
        this.characterContent.render(ctx, equipment, playerStats);
      }
      ctx.restore();
    } else {
      // Static: render active tab
      if (this.activeTab === 0) {
        this.inventoryContent.render(ctx, inventory);
      } else {
        this.characterContent.render(ctx, equipment, playerStats);
      }
    }

    ctx.restore(); // end content clip

    ctx.restore(); // end scale/alpha
  }

  _renderHeader(ctx) {
    // Title
    ctx.fillStyle = '#c9a84c';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(TABS[this.activeTab].label.toUpperCase(), this.x + 12, this.y + 20);

    // Close button
    ctx.fillStyle = '#666';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('[X]', this.x + this.width - 10, this.y + 20);

    // Header bottom line
    ctx.fillStyle = '#222';
    ctx.fillRect(this.x + 8, this.y + HEADER_H - 1, this.width - 16, 1);
  }

  _renderTabBar(ctx) {
    const tabY = this.y + HEADER_H;
    const tabW = this.width / TABS.length;
    const isPhone = this._canvasW < 400;

    // Tab bar background
    ctx.fillStyle = '#0d0d18';
    ctx.fillRect(this.x, tabY, this.width, TAB_BAR_H);

    for (let i = 0; i < TABS.length; i++) {
      const tx = this.x + i * tabW;
      const isActive = i === this.activeTab;
      const isFocused = this.focusZone === 'tabs' && i === this.activeTab;

      // Tab background
      ctx.fillStyle = isActive ? '#1a1a2e' : '#0d0d18';
      ctx.fillRect(tx, tabY, tabW, TAB_BAR_H);

      // Active tab gold underline
      if (isActive) {
        ctx.fillStyle = '#c9a84c';
        ctx.fillRect(tx + 8, tabY + TAB_BAR_H - 3, tabW - 16, 3);
      }

      // Focus border for controller
      if (isFocused) {
        ctx.strokeStyle = '#c9a84c';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx + 2, tabY + 2, tabW - 4, TAB_BAR_H - 6);
      }

      // Tab icon
      const icon = uiSprites.get(TABS[i].iconId);
      const iconCenterX = isPhone ? tx + tabW / 2 : tx + 14 + TAB_ICON_SIZE / 2;
      const iconY = tabY + (TAB_BAR_H - TAB_ICON_SIZE) / 2;
      if (icon) {
        ctx.globalAlpha = isActive ? 1.0 : 0.45;
        ctx.drawImage(icon, iconCenterX - TAB_ICON_SIZE / 2, iconY, TAB_ICON_SIZE, TAB_ICON_SIZE);
        ctx.globalAlpha = 1.0;
      }

      // Tab label (hidden on phone)
      if (!isPhone) {
        ctx.fillStyle = isActive ? '#c9a84c' : '#555';
        ctx.font = isActive ? 'bold 11px monospace' : '11px monospace';
        ctx.textAlign = 'left';
        const labelX = icon ? iconCenterX + TAB_ICON_SIZE / 2 + 6 : tx + 10;
        ctx.fillText(TABS[i].label, labelX, tabY + TAB_BAR_H / 2 + 4);
      }
    }

    // Tab divider
    ctx.fillStyle = '#222';
    ctx.fillRect(this.x, tabY + TAB_BAR_H - 1, this.width, 1);
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}
