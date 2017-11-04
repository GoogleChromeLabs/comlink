Comlink.transferHandlers.set('EVENT', {
  canHandle(obj) {
    return obj instanceof Event;
  },
  serialize(obj) {
    return {
      targetId: obj && obj.target && obj.target.id,
      detail: obj && obj.detail,
    };
  },
  deserialize(obj) {
    return obj;
  },
});
