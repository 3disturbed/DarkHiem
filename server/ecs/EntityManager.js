export default class EntityManager {
  constructor() {
    this.entities = new Map(); // id -> Entity
    this.pendingDestroy = [];
  }

  add(entity) {
    this.entities.set(entity.id, entity);
    return entity;
  }

  remove(id) {
    this.entities.delete(id);
  }

  get(id) {
    return this.entities.get(id) || null;
  }

  getByTag(tag) {
    const result = [];
    for (const entity of this.entities.values()) {
      if (entity.active && entity.hasTag(tag)) {
        result.push(entity);
      }
    }
    return result;
  }

  query(componentClasses) {
    const result = [];
    for (const entity of this.entities.values()) {
      if (entity.active && entity.hasAllComponents(componentClasses)) {
        result.push(entity);
      }
    }
    return result;
  }

  queryOne(componentClasses) {
    for (const entity of this.entities.values()) {
      if (entity.active && entity.hasAllComponents(componentClasses)) {
        return entity;
      }
    }
    return null;
  }

  markForDestroy(entity) {
    this.pendingDestroy.push(entity);
  }

  flushDestroyed() {
    for (const entity of this.pendingDestroy) {
      entity.active = false;
      this.entities.delete(entity.id);
    }
    this.pendingDestroy.length = 0;
  }

  getAll() {
    return Array.from(this.entities.values()).filter((e) => e.active);
  }

  count() {
    return this.entities.size;
  }

  clear() {
    this.entities.clear();
    this.pendingDestroy.length = 0;
  }
}
