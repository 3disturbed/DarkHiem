export default class Component {
  constructor() {
    if (new.target === Component) {
      throw new Error('Component is abstract - extend it');
    }
  }

  serialize() {
    const data = {};
    for (const [key, value] of Object.entries(this)) {
      data[key] = value;
    }
    return data;
  }
}
