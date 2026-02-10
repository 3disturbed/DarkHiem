export default class System {
  constructor(priority = 0) {
    if (new.target === System) {
      throw new Error('System is abstract - extend it');
    }
    this.priority = priority;
    this.enabled = true;
  }

  update(dt, entityManager, context) {
    // Override in subclass
  }
}
