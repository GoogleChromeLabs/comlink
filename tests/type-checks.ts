import { assert, Has, NotHas, IsExact } from "conditional-type-checks";

import * as Comlink from "../src/comlink.js";

async function test1() {
  function simpleNumberFunction() {
    return 4;
  }

  const proxy = Comlink.wrap<typeof simpleNumberFunction>(0 as any);
  const v = proxy();
  assert<IsExact<typeof v, Promise<number>>>(true);
}

async function test2() {
  function simpleObjectFunction() {
    return { a: 3 };
  }

  const proxy = Comlink.wrap<typeof simpleObjectFunction>(0 as any);
  const v = await proxy();
  assert<IsExact<typeof v, { a: number }>>(true);
}

async function test3() {
  function functionWithProxy() {
    return Comlink.proxy({ a: 3 });
  }

  const proxy = Comlink.wrap<typeof functionWithProxy>(0 as any);
  const subproxy = await proxy();
  const prop = subproxy.a;
  assert<IsExact<typeof prop, Promise<number>>>(true);
}

async function test4() {
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

  const proxy = Comlink.wrap<typeof X>(0 as any);
  assert<Has<typeof proxy, { staticFunc: () => Promise<number> }>>(true);
  const instance = await new proxy();
  assert<Has<typeof instance, { sayHi: () => Promise<string> }>>(true);
  assert<Has<typeof instance, { g: Promise<number> }>>(true);
  assert<NotHas<typeof instance, { f: Promise<number> }>>(true);
}
