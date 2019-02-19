// This file contains tests that assert that the TypeScript types are correct, using $Expect* comments
// Check them with `npm run dtslint`
// This code is only analyzed, not executed.

import * as Comlink from "../comlink";
import { wrap } from "../messagechanneladapter";

async function main() {
  Comlink.proxy(new MessageChannel().port1);
  Comlink.expose({}, new MessageChannel().port2);
  const connection = new RTCPeerConnection();
  const channel = connection.createDataChannel("comlink");
  Comlink.proxy(wrap(channel));
  Comlink.expose({}, wrap(channel));

  interface Baz {
    baz: number;
    method(): number;
  }

  class Foo {
    constructor(cParam: string) {}
    prop1: string = "abc";
    proxyProp = Comlink.proxyValue(new Bar()); // $ExpectType Bar & ProxyValue
    methodWithTupleParams(...args: [string] | [number, string]): number {
      return 123;
    }
    methodWithProxiedReturnValue(): Baz & Comlink.ProxyValue {
      return Comlink.proxyValue({ baz: 123, method: () => 123 });
    }
    methodWithProxyParameter(param: Baz & Comlink.ProxyValue): void {}
  }

  class Bar {
    prop2: string | number = "abc";
    method(param: string): number {
      return 123;
    }
    methodWithProxiedReturnValue(): Baz & Comlink.ProxyValue {
      return Comlink.proxyValue({ baz: 123, method: () => 123 });
    }
  }

  const proxy = Comlink.proxy<Foo>(self); // $ExpectType ProxiedObject<Foo>

  proxy.prop1; // $ExpectType Promise<string>
  proxy.methodWithTupleParams(123, "abc"); // $ExpectType Promise<number>
  proxy.methodWithTupleParams("abc"); // $ExpectType Promise<number>
  proxy.proxyProp; // $ExpectType ProxiedObject<Bar & ProxyValue>
  proxy.proxyProp.prop2; // $ExpectType Promise<string> | Promise<number>
  proxy.proxyProp.method("param"); // $ExpectType Promise<number>
  proxy.proxyProp.method(123); // $ExpectError
  proxy.proxyProp.method(); // $ExpectError
  proxy.methodWithProxiedReturnValue(); // $ExpectType Promise<ProxiedObject<Baz & ProxyValue>>
  proxy.proxyProp.methodWithProxiedReturnValue(); // $ExpectType Promise<ProxiedObject<Baz & ProxyValue>>
  (await proxy.methodWithProxiedReturnValue()).baz; // $ExpectType Promise<number>
  (await proxy.methodWithProxiedReturnValue()).method(); // $ExpectType Promise<number>

  const ProxiedFooClass = Comlink.proxy<typeof Foo>(self);
  await new ProxiedFooClass("test"); // $ExpectType ProxiedObject<Foo>
  await new ProxiedFooClass(123); // $ExpectError
  await new ProxiedFooClass(); // $ExpectError

  //
  // Tests for advanced proxy use cases
  //

  interface Subscriber<T> {
    closed: boolean;
    next: (value: T) => void;
  }
  interface Unsubscribable {
    unsubscribe(): void;
  }
  /** A Subscribable that can get proxied by Comlink */
  interface ProxySubscribable<T> extends Comlink.ProxyValue {
    subscribe(
      subscriber: Comlink.ProxyResult<
        Partial<Subscriber<T>> & Comlink.ProxyValue
      >
    ): Unsubscribable & Comlink.ProxyValue;
  }

  /** Simple parameter object that gets cloned (not proxied) */
  interface Params {
    textDocument: string;
  }

  class Registry {
    async registerProvider(
      provider: Comlink.ProxyResult<
        ((params: Params) => ProxySubscribable<string>) & Comlink.ProxyValue
      >
    ) {
      // $ExpectType Promise<ProxiedObject<ProxySubscribable<string>>>
      const resultPromise = provider({ textDocument: "foo" });
      const result = await resultPromise;

      // $ExpectType Promise<ProxiedObject<Unsubscribable & ProxyValue>>
      const subscriptionPromise = result.subscribe({
        [Comlink.proxyValueSymbol]: true,
        next: value => {
          value; // $ExpectType string
        }
      });
      const subscriber = Comlink.proxyValue({
        next: (value: string) => console.log(value)
      });
      result.subscribe(subscriber);

      (await subscriptionPromise).unsubscribe(); // $ExpectType Promise<void>
    }
  }
  const proxy2 = Comlink.proxy<Registry>(self);

  proxy2.registerProvider(
    // Synchronous callback
    Comlink.proxyValue(({ textDocument }: Params) => {
      return Comlink.proxyValue({
        subscribe(
          subscriber: Comlink.ProxyResult<
            Partial<Subscriber<string>> & Comlink.ProxyValue
          >
        ): Unsubscribable & Comlink.ProxyValue {
          // Important to test here is that union types (as Function | undefined) distribute properly
          // when wrapped in Promises/proxied

          subscriber.closed; // $ExpectType Promise<true> | Promise<undefined> | Promise<false> | undefined
          subscriber.next; // $ExpectType Promise<undefined> | ProxyResult<(value: string) => void> | undefined
          subscriber.next(); // $ExpectError

          if (subscriber.next) {
            // Only checking for presence is not enough, since it could be a Promise
            subscriber.next(); // $ExpectError
          }

          if (typeof subscriber.next === "function") {
            subscriber.next("abc");
          }

          return Comlink.proxyValue({ unsubscribe() {} });
        }
      });
    })
  );
  proxy2.registerProvider(
    // Async callback
    Comlink.proxyValue(async ({ textDocument }: Params) => {
      return Comlink.proxyValue({
        subscribe(
          subscriber: Comlink.ProxyResult<
            Partial<Subscriber<string>> & Comlink.ProxyValue
          >
        ): Unsubscribable & Comlink.ProxyValue {
          subscriber.next; // $ExpectType Promise<undefined> | ProxyResult<(value: string) => void> | undefined
          // Only checking for presence is not enough, since it could be a Promise
          if (typeof subscriber.next === "function") {
            subscriber.next("abc");
          }
          return Comlink.proxyValue({ unsubscribe() {} });
        }
      });
    })
  );
}
