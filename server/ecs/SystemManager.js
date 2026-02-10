export default class SystemManager {
  constructor() {
    this.systems = [];
    this.sorted = false;
  }

  add(system) {
    this.systems.push(system);
    this.sorted = false;
    return this;
  }

  remove(SystemClass) {
    this.systems = this.systems.filter((s) => !(s instanceof SystemClass));
  }

  get(SystemClass) {
    return this.systems.find((s) => s instanceof SystemClass) || null;
  }

  update(dt, entityManager, context) {
    if (!this.sorted) {
      this.systems.sort((a, b) => a.priority - b.priority);
      this.sorted = true;
    }

    for (const system of this.systems) {
      if (system.enabled) {
        system.update(dt, entityManager, context);
      }
    }
  }
}
