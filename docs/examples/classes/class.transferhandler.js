function initClassTransferHandler(supportedClasses) {
  Comlink.transferHandlers.set('CLASS', {
    canHandle(obj) {
      return supportedClasses.some(clazz => obj instanceof clazz);
    },
    serialize(instance) {
      return {
        instance,
        clazz: supportedClasses.find(clazz => instance instanceof clazz).name,
      };
    },
    deserialize({instance, clazz}) {
      Reflect.setPrototypeOf(instance, supportedClasses.find(c => c.name === clazz).prototype);
      return instance;
    },
  });
}
