export interface TransferHandler {
  canHandle(obj: any): boolean;
  serialize(obj: any): [any, Transferable[]];
  deserialize(obj: any): any;
}
export namespace TransferHandler {
  export interface SerializeOnly extends Omit<TransferHandler, "deserialize"> {}
  export interface DeserializeOnly
    extends Pick<TransferHandler, "deserialize"> {}
  export type Any = TransferHandler | SerializeOnly | DeserializeOnly;
}

type MapValueType<M extends Map<any, any>> = M extends Map<any, infer U>
  ? U
  : never;
namespace TransferHandlerMap {
  export type Name = string; //| number;
  export type Type = keyof TransferHandlerMap["_map"];
  export type TypeModel = keyof typeof MODE_TRANSFER_TYPES_MAP;

  type TYPES_KEYS<T extends ReadonlyArray<Type>> =
    | T[0]
    | (T[1] extends undefined ? never : T[1])
    | (T[2] extends undefined ? never : T[2]);

  /**
   * use **extends** checker, to make some type which is <extends TypeModel> can work to.
   * @type { TYPES_KEYS<typeof MODE_TRANSFER_TYPES_MAP[T]> }
   */
  export type ModelTypes<T extends TypeModel> = T extends TypeModel
    ? TYPES_KEYS<typeof MODE_TRANSFER_TYPES_MAP[T]>
    : never;

  export type Handler<M extends TypeModel> = MapValueType<
    TransferHandlerMap["_map"][TransferHandlerMap.ModelTypes<M>]
  >;

  export interface Both extends TransferHandler {
    type: "both";
  }
  export interface SerializeOnly extends TransferHandler.SerializeOnly {
    type: "serialize";
  }
  export interface DeserializeOnly extends TransferHandler.DeserializeOnly {
    type: "deserialize";
  }
  export type Any = Both | SerializeOnly | DeserializeOnly;
}

const ANY_TRANSFER_TYPES = ["deserialize", "serialize", "both"] as const;
const DESERIALIZABLE_TRANSFER_TYPES = ["deserialize", "both"] as const;
const SERIALIZABLE_TRANSFER_TYPES = ["serialize", "both"] as const;
const DESERIALIZEONLY_TRANSFER_TYPES = ["deserialize"] as const;
const SERIALIZEONLY_TRANSFER_TYPES = ["serialize"] as const;
const BOTHONLY_TRANSFER_TYPES = ["both"] as const;

const MODE_TRANSFER_TYPES_MAP = {
  any: ANY_TRANSFER_TYPES,
  deserializable: DESERIALIZABLE_TRANSFER_TYPES,
  serializable: SERIALIZABLE_TRANSFER_TYPES,
  deserializeonly: DESERIALIZEONLY_TRANSFER_TYPES,
  serializeonly: SERIALIZEONLY_TRANSFER_TYPES,
  bothonly: BOTHONLY_TRANSFER_TYPES
};

export class TransferHandlerMap {
  constructor(
    entries?: ReadonlyArray<
      readonly [TransferHandlerMap.Name, TransferHandler.Any]
    > | null
  ) {
    if (entries) {
      for (const item of entries) {
        this.set(item[0], item[1]);
      }
    }
  }
  /**
   * TransferType and TransferHandlers mapping.
   */
  /* private */ _map = {
    both: new Map<TransferHandlerMap.Name, TransferHandlerMap.Both>(),
    serialize: new Map<
      TransferHandlerMap.Name,
      TransferHandlerMap.SerializeOnly
    >(),
    deserialize: new Map<
      TransferHandlerMap.Name,
      TransferHandlerMap.DeserializeOnly
    >()
  };

  /**
   * TransferName and TransferType mapping
   */
  private _nameTypeMap = new Map<
    TransferHandlerMap.Name,
    TransferHandlerMap.Type
  >();

  set(name: TransferHandlerMap.Name, transferHandler: TransferHandler.Any) {
    /// try remove old one first. ensure transferHandler exists in one map only
    this.delete(name);

    let type: TransferHandlerMap.Type;
    if ("canHandle" in transferHandler) {
      if ("deserialize" in transferHandler) {
        type = "both";
        this._map[type].set(name, {
          type,
          canHandle: transferHandler.canHandle,
          serialize: transferHandler.serialize,
          deserialize: transferHandler.deserialize
        });
      } else {
        type = "serialize";
        this._map[type].set(name, {
          type,
          canHandle: transferHandler.canHandle,
          serialize: transferHandler.serialize
        });
      }
    } else {
      type = "deserialize";
      this._map[type].set(name, {
        type,
        deserialize: transferHandler.deserialize
      });
    }
    /// falg the TransferName's TransferType
    this._nameTypeMap.set(name, type);
  }

  get<M extends TransferHandlerMap.TypeModel>(
    name: TransferHandlerMap.Name,
    mode: M = "any" as M
  ) {
    for (const type of MODE_TRANSFER_TYPES_MAP[mode]) {
      const transferHandler = this._map[type].get(name);
      if (transferHandler) {
        return transferHandler as TransferHandlerMap.Handler<M>;
      }
    }
  }

  has(
    name: TransferHandlerMap.Name,
    mode: TransferHandlerMap.TypeModel = "any"
  ) {
    return MODE_TRANSFER_TYPES_MAP[mode].some(type =>
      this._map[type].has(name)
    );
  }

  delete(name: TransferHandlerMap.Name) {
    const oldType = this._nameTypeMap.get(name);
    if (oldType) {
      return this._map[oldType].delete(name);
    }
    return false;
  }

  clear() {
    for (const type of ANY_TRANSFER_TYPES) {
      this._map[type].clear();
    }
  }
  forEach<M extends TransferHandlerMap.TypeModel>(
    callbackfn: (
      value: TransferHandlerMap.Handler<M>,
      key: TransferHandlerMap.Name,
      map: ReadonlyMap<TransferHandlerMap.Name, TransferHandlerMap.Handler<M>>
    ) => void,
    thisArg?: any,
    mode: M = "any" as M
  ) {
    for (const type of MODE_TRANSFER_TYPES_MAP[mode]) {
      this._map[type].forEach(callbackfn as any, thisArg);
    }
  }
  get size() {
    return ANY_TRANSFER_TYPES.reduce(
      (size, type) => size + this._map[type].size,
      0
    );
  }
  getSize(mode: TransferHandlerMap.TypeModel = "any") {
    let size = 0;
    for (const type of MODE_TRANSFER_TYPES_MAP[mode]) {
      size = +this._map[type].size;
    }
    return size;
  }

  /** Returns an iterable of entries in the map. */
  [Symbol.iterator]<M extends TransferHandlerMap.TypeModel>(
    mode: M = "any" as M
  ) {
    return this.entries<M>(mode);
  }

  /**
   * Returns an iterable of key, value pairs for every entry in the map.
   */
  *entries<M extends TransferHandlerMap.TypeModel>(mode: M = "any" as M) {
    for (const type of MODE_TRANSFER_TYPES_MAP[mode]) {
      yield* this._map[type].entries() as IterableIterator<
        [TransferHandlerMap.Name, TransferHandlerMap.Handler<M>]
      >;
    }
  }

  /**
   * Returns an iterable of keys in the map
   */
  *keys(mode: TransferHandlerMap.TypeModel = "any") {
    for (const type of MODE_TRANSFER_TYPES_MAP[mode]) {
      yield* this._map[type].keys();
    }
  }

  /**
   * Returns an iterable of values in the map
   */
  *values<M extends TransferHandlerMap.TypeModel>(mode: M = "any" as M) {
    for (const type of MODE_TRANSFER_TYPES_MAP[mode]) {
      yield* this._map[type].values() as IterableIterator<
        TransferHandlerMap.Handler<M>
      >;
    }
  }
}
