// This file contains tests that assert that the TypeScript types are correct, using $Expect* comments
// Check them with `npm run dtslint`
// This code is only analyzed, not executed.

import * as Comlink from "../comlink";

async function main() {
  class Foo {
    constructor(cParam: string) {}
    prop1: string = "abc";
    proxyProp = Comlink.proxyValue(new Bar()); // $ExpectType Bar & ProxyValue
  }

  class Bar {
    prop2: string = "abc";
    method(param: string): number {
      return 123;
    }
  }

  const proxy = Comlink.proxy<Foo>(self); // $ExpectType ProxiedObject<Foo>

  proxy.prop1; // $ExpectType Promise<string>
  proxy.proxyProp; // $ExpectType ProxiedObject<Pick<Bar & ProxyValue, "prop2" | "method">>
  proxy.proxyProp.prop2; // $ExpectType Promise<string>
  proxy.proxyProp.method("param"); // $ExpectType Promise<number>
  proxy.proxyProp.method(123); // $ExpectError
  proxy.proxyProp.method(); // $ExpectError

  const ProxiedFooClass = Comlink.proxy<typeof Foo>(self);
  await new ProxiedFooClass("test"); // $ExpectType ProxiedObject<Foo>
  await new ProxiedFooClass(123); // $ExpectError
  await new ProxiedFooClass(); // $ExpectError
}
