import { assert, Has, NotHas, IsAny, IsExact } from "conditional-type-checks";

import * as Comlink from "../src/comlink.js";
import { RemoteController } from "../src/remote-controller.js";

async function closureSoICanUseAwait() {
  {
    function simpleNumberFunction() {
      return 4;
    }

    const ex = Comlink.expose(simpleNumberFunction);
    const proxy = Comlink.wrap<typeof ex>(0 as any);
    assert<IsAny<typeof proxy>>(false);
    const v = proxy();
    assert<Has<typeof v, Promise<number>>>(true);
  }

  {
    function simpleObjectFunction() {
      return { a: 3 };
    }

    const ex = Comlink.expose(simpleObjectFunction);
    const proxy = Comlink.wrap<typeof ex>(0 as any);
    const v = await proxy();
    assert<Has<typeof v, { a: number }>>(true);
  }

  {
    async function simpleAsyncFunction() {
      return { a: 3 };
    }

    const ex = Comlink.expose(simpleAsyncFunction);
    const proxy = Comlink.wrap<typeof ex>(0 as any);
    const v = await proxy();
    assert<Has<typeof v, { a: number }>>(true);
  }

  {
    function functionWithProxy() {
      return Comlink.proxy({ a: 3 });
    }

    const ex = Comlink.expose(functionWithProxy);
    const proxy = Comlink.wrap<typeof ex>(0 as any);
    const subproxy = await proxy();
    const prop = subproxy.a;
    assert<Has<typeof prop, Promise<number>>>(true);
  }

  {
    class X {
      static staticFunc() {
        return 4;
      }
      private f = 4;
      public g = 9;
      sayHi() {
        return "hi";
      }
    }

    const ex = Comlink.expose(X);
    const proxy = Comlink.wrap<typeof ex>(0 as any);
    assert<Has<typeof proxy, { staticFunc: () => Promise<number> }>>(true);
    const instance = await new proxy();
    assert<Has<typeof instance, { sayHi: () => Promise<string> }>>(true);
    assert<Has<typeof instance, { g: Promise<number> }>>(true);
    assert<NotHas<typeof instance, { f: Promise<number> }>>(true);
    assert<IsAny<typeof instance>>(false);
  }

  {
    const x = {
      a: 4,
      b() {
        return 9;
      },
      c: {
        d: 3,
      },
    };

    const ex = Comlink.expose(x);
    const proxy = Comlink.wrap<typeof ex>(0 as any);
    assert<IsAny<typeof proxy>>(false);
    const a = proxy.a;
    assert<Has<typeof a, Promise<number>>>(true);
    assert<IsAny<typeof a>>(false);
    const b = proxy.b;
    assert<Has<typeof b, () => Promise<number>>>(true);
    assert<IsAny<typeof b>>(false);
    const subproxy = proxy.c;
    assert<Has<typeof subproxy, Promise<{ d: number }>>>(true);
    assert<IsAny<typeof subproxy>>(false);
    const copy = await proxy.c;
    assert<Has<typeof copy, { d: number }>>(true);
  }

  {
    Comlink.wrap(new MessageChannel().port1);
    Comlink.expose({}, new MessageChannel().port2);

    interface Baz {
      baz: number;
      method(): number;
    }

    class Foo {
      constructor(cParam: string) {
        const self = this;
        assert<IsExact<typeof self.proxyProp, Comlink.ProxyMarked<Bar>>>(true);
      }
      prop1: string = "abc";
      proxyProp = Comlink.proxy(new Bar());
      methodWithTupleParams(...args: [string] | [number, string]): number {
        return 123;
      }
      methodWithProxiedReturnValue(): Comlink.ProxyMarked<Baz> {
        return Comlink.proxy({ baz: 123, method: () => 123 });
      }
      methodWithProxyParameter(param: Comlink.ProxyMarked<Baz>): void {}
    }

    class Bar {
      prop2: string | number = "abc";
      method(param: string): number {
        return 123;
      }
      methodWithProxiedReturnValue(): Comlink.ProxyMarked<Baz> {
        return Comlink.proxy({ baz: 123, method: () => 123 });
      }
    }
    const ex = Comlink.expose(new Foo(""));
    const proxy = Comlink.wrap<typeof ex>(Comlink.windowEndpoint(self));
    assert<IsExact<typeof proxy, Comlink.Remote<Foo>>>(true);

    proxy[Symbol.asyncDispose]();
    const controller = proxy[Comlink.proxyRemoteData].controller as RemoteController;
    const endp = controller.createEndPoint(0);
    assert<IsExact<typeof endp, Promise<MessagePort>>>(true);

    assert<IsAny<typeof proxy.prop1>>(false);
    assert<Has<typeof proxy.prop1, Promise<string>>>(true);

    const r1 = proxy.methodWithTupleParams(123, "abc");
    assert<IsExact<typeof r1, Promise<number>>>(true);

    const r2 = proxy.methodWithTupleParams("abc");
    assert<IsExact<typeof r2, Promise<number>>>(true);

    assert<
      IsExact<typeof proxy.proxyProp, Comlink.Remote<Bar> & Promise<Comlink.Remote<Bar>>>
    >(true);

    assert<IsAny<typeof proxy.proxyProp.prop2>>(false);
    assert<Has<typeof proxy.proxyProp.prop2, Promise<string>>>(true);
    assert<Has<typeof proxy.proxyProp.prop2, Promise<number>>>(true);

    const r3 = proxy.proxyProp.method("param");
    assert<IsAny<typeof r3>>(false);
    assert<Has<typeof r3, Promise<number>>>(true);

    // @ts-expect-error
    proxy.proxyProp.method(123);

    // @ts-expect-error
    proxy.proxyProp.method();

    const r4 = proxy.methodWithProxiedReturnValue();
    assert<IsAny<typeof r4>>(false);
    assert<
      IsExact<typeof r4, Promise<Comlink.Remote<Baz>>>
    >(true);

    const r5 = proxy.proxyProp.methodWithProxiedReturnValue();
    assert<
      IsExact<typeof r5, Promise<Comlink.Remote<Baz>>>
    >(true);

    const r6 = (await proxy.methodWithProxiedReturnValue()).baz;
    assert<IsAny<typeof r6>>(false);
    assert<Has<typeof r6, Promise<number>>>(true);

    const r7 = (await proxy.methodWithProxiedReturnValue()).method();
    assert<IsAny<typeof r7>>(false);
    assert<Has<typeof r7, Promise<number>>>(true);

    const thingFoo = Comlink.expose(Foo);
    const ProxiedFooClass = Comlink.wrap<typeof thingFoo>(
      Comlink.windowEndpoint(self)
    );
    const inst1 = await new ProxiedFooClass("test");
    assert<IsExact<typeof inst1, Comlink.Remote<Foo>>>(true);
    inst1[Symbol.asyncDispose]();
    inst1[Comlink.proxyRemoteData];

    // @ts-expect-error
    await new ProxiedFooClass(123);

    // @ts-expect-error
    await new ProxiedFooClass();

    //
    // Tests for advanced proxy use cases
    //

    // Type round trips
    // This tests that Local is the exact inverse of Remote for objects:
    assert<
      IsExact<
        Comlink.Local<Comlink.Remote<Comlink.ProxyMarked>>,
        Comlink.ProxyMarked
      >
    >(true);
    // This tests that Local is the exact inverse of Remote for functions, with one difference:
    // The local version of a remote function can be either implemented as a sync or async function,
    // because Remote<T> always makes the function async.
    assert<
      IsExact<
        Comlink.Local<Comlink.Remote<(a: number) => string>>,
        (a: number) => string | Promise<string>
      >
    >(true);

    interface Subscriber<T> {
      closed?: boolean;
      next?: (value: T) => void;
    }
    interface Unsubscribable {
      unsubscribe(): void;
    }
    /** A Subscribable that can get proxied by Comlink */
    interface ProxyableSubscribable<T> {
      [Comlink.proxyMarker]: true;
      subscribe(
        subscriber: Comlink.Remote<Subscriber<T>>
      ): Comlink.ProxyMarked<Unsubscribable>;
    }

    /** Simple parameter object that gets cloned (not proxied) */
    interface Params {
      textDocument: string;
    }

    class Registry {
      async registerProvider(
        provider: Comlink.Remote<
          (params: Params) => ProxyableSubscribable<string>
        >
      ) {
        const resultPromise = provider({ textDocument: "foo" });
        assert<
          IsExact<
            typeof resultPromise,
            Promise<Comlink.Remote<ProxyableSubscribable<string>>>
          >
        >(true);
        const result = await resultPromise;

        const subscriptionPromise = result.subscribe({
          [Comlink.proxyMarker]: true,
          next: (value) => {
            assert<IsExact<typeof value, string>>(true);
          },
        });
        assert<
          IsExact<
            typeof subscriptionPromise,
            Promise<Comlink.Remote<Unsubscribable>>
          >
        >(true);
        const subscriber = Comlink.proxy({
          next: (value: string) => console.log(value),
        });
        result.subscribe(subscriber);

        const r1 = (await subscriptionPromise).unsubscribe();
        assert<IsExact<typeof r1, Promise<void>>>(true);
      }
    }
    const exposedRegistry = Comlink.expose(new Registry());
    const proxy2 = Comlink.wrap<typeof exposedRegistry>(Comlink.windowEndpoint(self));

    proxy2.registerProvider(
      // Synchronous callback
      Comlink.proxy(({ textDocument }: Params) => {
        const subscribable = Comlink.proxy({
          subscribe(
            subscriber: Comlink.Remote<Subscriber<string>>
          ): Comlink.ProxyMarked<Unsubscribable> {
            // Important to test here is that union types (such as Function | undefined) distribute properly
            // when wrapped in Promises/proxied

            assert<IsAny<typeof subscriber.closed>>(false);
            assert<
              IsExact<
                typeof subscriber.closed,
                 (Promise<undefined> | Promise<false> | Promise<true>) & {
                  [Comlink.opch]: Promise<false> | Promise<true>;
                }
              >
            >(true);

            assert<IsAny<typeof subscriber.next>>(false);
            assert<
              IsExact<
                typeof subscriber.next,
                (Comlink.Remote<(value: string) => void> | Promise<undefined>) & {
                  [Comlink.opch]: Comlink.Remote<(value: string) => void>;
                }
              >
            >(true);

            // @ts-expect-error
            subscriber.next();

            if (subscriber.next) {
              // Only checking for presence is not enough, since it could be a Promise
              // @ts-expect-error
              subscriber.next();
            }

            if (typeof subscriber.next === "function") {
              subscriber.next("abc");
            }

            return Comlink.proxy({ unsubscribe() {} });
          },
        });
        assert<Has<typeof subscribable, Comlink.ProxyMarked<unknown>>>(true);
        return subscribable;
      })
    );
    proxy2.registerProvider(
      // Async callback
      Comlink.proxy(async ({ textDocument }: Params) => {
        const subscribable = Comlink.proxy({
          subscribe(
            subscriber: Comlink.Remote<Subscriber<string>>
          ): Comlink.ProxyMarked<Unsubscribable> {
            assert<IsAny<typeof subscriber.next>>(false);
            assert<
              IsExact<
                typeof subscriber.next,
                (Comlink.Remote<(value: string) => void> | Promise<undefined>) & {
                  [Comlink.opch]: Comlink.Remote<(value: string) => void>;
                }
              >
            >(true);

            // Only checking for presence is not enough, since it could be a Promise
            if (typeof subscriber.next === "function") {
              subscriber.next("abc");
            }
            return Comlink.proxy({ unsubscribe() {} });
          },
        });
        return subscribable;
      })
    );
  }

  // Transfer handlers
  {
    const urlTransferHandler: Comlink.TransferHandler<URL, string> = {
      canHandle: (val): val is URL => {
        assert<IsExact<typeof val, unknown>>(true);
        return val instanceof URL;
      },
      serialize: async (url) => {
        assert<IsExact<typeof url, URL>>(true);
        return [url.href, []];
      },
      deserialize: async (str) => {
        assert<IsExact<typeof str, string>>(true);
        return new URL(str);
      },
    };
    Comlink.transferHandlers.set("URL", urlTransferHandler);
  }
}
