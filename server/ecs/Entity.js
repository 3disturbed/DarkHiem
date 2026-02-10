let nextEntityId = 1;

export default class Entity {
  constructor(id = null) {
    this.id = id || `e${nextEntityId++}`;
    this.components = new Map();
    this.tags = new Set();
    this.active = true;
  }

  addComponent(component) {
    this.components.set(component.constructor.name, component);
    return this;
  }

  removeComponent(ComponentClass) {
    this.components.delete(ComponentClass.name);
    return this;
  }

  getComponent(ComponentClass) {
    return this.components.get(ComponentClass.name) || null;
  }

  hasComponent(ComponentClass) {
    return this.components.has(ComponentClass.name);
  }

  hasAllComponents(componentClasses) {
    for (const cls of componentClasses) {
      if (!this.components.has(cls.name)) return false;
    }
    return true;
  }

  addTag(tag) {
    this.tags.add(tag);
    return this;
  }

  hasTag(tag) {
    return this.tags.has(tag);
  }

  destroy() {
    this.active = false;
  }
}
