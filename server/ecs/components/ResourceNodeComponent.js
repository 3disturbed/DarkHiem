import Component from '../Component.js';

export default class ResourceNodeComponent extends Component {
  constructor(resourceData) {
    super();
    this.resourceId = resourceData.id;
    this.tool = resourceData.tool || 'none';      // 'pickaxe', 'axe', 'none'
    this.toolTier = resourceData.toolTier || 0;    // minimum tool tier required
    this.respawnTime = resourceData.respawnTime || 300; // seconds
    this.depleted = false;
    this.depletedAt = 0;
    this.chunkKey = resourceData.chunkKey || null;  // track which chunk this belongs to
    this.resourceIndex = resourceData.resourceIndex ?? -1; // index in chunk.resources
  }
}
