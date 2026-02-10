export default class MessageRouter {
  constructor() {
    this.handlers = new Map();
  }

  register(messageType, handler) {
    if (!this.handlers.has(messageType)) {
      this.handlers.set(messageType, []);
    }
    this.handlers.get(messageType).push(handler);
  }

  route(messageType, player, data) {
    const handlers = this.handlers.get(messageType);
    if (!handlers) return;

    for (const handler of handlers) {
      handler(player, data);
    }
  }
}
