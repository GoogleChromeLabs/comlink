import { assert, Has, NotHas, IsAny } from "conditional-type-checks";

import * as Comlink from "../src/comlink.js";

async function closureSoICanUseAwait() {
  {
    function simpleNumberFunction() {
      return 4;
    }

    const proxy = Comlink.wrap<typeof simpleNumberFunction>(0 as any);
    assert<IsAny<typeof proxy>>(false);
    const v = proxy();
    assert<Has<typeof v, Promise<number>>>(true);
  }

  {
    function simpleObjectFunction() {
      return { a: 3 };
    }

    const proxy = Comlink.wrap<typeof simpleObjectFunction>(0 as any);
    const v = await proxy();
    assert<Has<typeof v, { a: number }>>(true);
  }

  {
    async function simpleAsyncFunction() {
      return { a: 3 };
    }

    const proxy = Comlink.wrap<typeof simpleAsyncFunction>(0 as any);
    const v = await proxy();
    assert<Has<typeof v, { a: number }>>(true);
  }

  {
    function functionWithProxy() {
      return Comlink.proxy({ a: 3 });
    }

    const proxy = Comlink.wrap<typeof functionWithProxy>(0 as any);
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

    const proxy = Comlink.wrap<typeof X>(0 as any);
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
        d: 3
      }
    };

    const proxy = Comlink.wrap<typeof x>(0 as any);
    assert<IsAny<typeof proxy>>(false);
    const a = proxy.a;
    assert<Has<typeof a, Promise<number>>>(true);
    assert<IsAny<typeof a>>(false);
    const b = proxy.b;
    assert<Has<typeof b, () => Promise<number>>>(true);
    assert<IsAny<typeof b>>(false);
    const subproxy = proxy.c;
    assert<Has<typeof subproxy, { d: Promise<number> }>>(true);
    assert<IsAny<typeof subproxy>>(false);
    const copy = await proxy.c;
    assert<Has<typeof copy, { d: number }>>(true);
  }
}
