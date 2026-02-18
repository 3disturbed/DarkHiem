const RESOURCE_IDS = [
  // Meadow
  'stick_pile', 'loose_stone', 'wood_oak', 'stone_node', 'copper_node',
  'berry_bush', 'flax_plant', 'cave_copper_vein', 'cave_tin_vein',
  // Dark Forest
  'wood_pine', 'wood_dark_oak', 'tin_node', 'mushroom_cluster', 'thistle',
  'cave_iron_vein', 'cave_coal_deposit',
  // Swamp
  'ancient_tree', 'iron_deposit', 'guck_sac', 'bloodbag',
  'cave_silver_vein', 'cave_iron_scrap_pile',
  // Mountain
  'silver_vein', 'obsidian_node', 'frost_pine', 'dragon_egg',
  'cave_obsidian_vein', 'cave_crystal_cluster',
  // Volcanic
  'flametal_node', 'obsidian_large', 'surtling_core_node', 'charred_bone_pile',
  'cave_flametal_vein', 'cave_sulfite_deposit',
];

class ResourceSprites {
  constructor() {
    this.sprites = {};
    this.loaded = false;
  }

  load() {
    const total = RESOURCE_IDS.length;
    let count = 0;

    return new Promise((resolve) => {
      if (total === 0) { this.loaded = true; resolve(); return; }

      for (const id of RESOURCE_IDS) {
        const img = new Image();
        img.onload = () => {
          this.sprites[id] = img;
          count++;
          if (count >= total) { this.loaded = true; resolve(); }
        };
        img.onerror = () => {
          count++;
          if (count >= total) { this.loaded = true; resolve(); }
        };
        img.src = `/tileArt/resources/${id}.png`;
      }
    });
  }

  get(resourceId) {
    return this.sprites[resourceId] || null;
  }
}

const resourceSprites = new ResourceSprites();
export default resourceSprites;
