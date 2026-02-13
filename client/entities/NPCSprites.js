const NPC_TYPES = ['quest_giver', 'vendor', 'guard', 'citizen'];

class NPCSprites {
  constructor() {
    this.sprites = {};
    this.loaded = false;
  }

  load() {
    const total = NPC_TYPES.length;
    let count = 0;

    return new Promise((resolve) => {
      if (total === 0) { this.loaded = true; resolve(); return; }

      for (const npcType of NPC_TYPES) {
        const img = new Image();
        img.onload = () => {
          this.sprites[npcType] = img;
          count++;
          if (count >= total) { this.loaded = true; resolve(); }
        };
        img.onerror = () => {
          count++;
          if (count >= total) { this.loaded = true; resolve(); }
        };
        img.src = `/tileArt/npcs/${npcType}.png`;
      }
    });
  }

  get(npcType) {
    return this.sprites[npcType] || null;
  }
}

const npcSprites = new NPCSprites();
export default npcSprites;
