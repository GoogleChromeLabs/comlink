/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { test, expect } from "./helpers/testPageFixture.js";

test.describe("Comlink in the same realm", () => {
  test.beforeEach(async ({ testPage, page }) => {
    await testPage.addComlinkImport();
    await page.evaluate(async () => {
      const { Comlink } = window.testData;
      class SampleClass {
        constructor(counterInit = 1) {
          this._counter = counterInit;
          this._promise = Promise.resolve(4);
        }

        static get SOME_NUMBER() {
          return 4;
        }

        static ADD(a, b) {
          return a + b;
        }

        get counter() {
          return this._counter;
        }

        set counter(value) {
          this._counter = value;
        }

        get promise() {
          return this._promise;
        }

        method() {
          return 4;
        }

        increaseCounter(delta = 1) {
          this._counter += delta;
        }

        promiseFunc() {
          return new Promise((resolve) => setTimeout((_) => resolve(4), 100));
        }

        proxyFunc() {
          return Comlink.proxy({
            counter: 0,
            inc() {
              this.counter++;
            },
          });
        }

        throwsAnError() {
          throw Error("OMG");
        }
      }

      const { port1, port2 } = new MessageChannel();
      port1.start();
      port2.start();

      window.testData = {
        Comlink,
        SampleClass,
        port1,
        port2,
      };
    });
  });

  test("can work with objects", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose({ value: 4 }, port2);
      return await thing.value;
    });
    expect(result).toEqual(4);
  });

  test("can work with functions on an object", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose({ f: (_) => 4 }, port2);
      return await thing.f();
    });
    expect(result).toEqual(4);
  });

  test("can work with functions", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose((_) => 4, port2);
      return await thing();
    });
    expect(result).toEqual(4);
  });

  test("can work with objects that have undefined properties", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose({ x: undefined }, port2);
      return await thing.x;
    });
    expect(result).toBeUndefined();
  });

  test("can keep the stack and message of thrown errors", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      let stack;
      const thing = Comlink.wrap(port1);
      Comlink.expose((_) => {
        const error = Error("OMG");
        stack = error.stack;
        throw error;
      }, port2);
      try {
        await thing();
        throw "Should have thrown";
      } catch (err) {
        return {
          throwExpected: err !== "Should have thrown",
          errMessage: err.message,
          stackEquals: err.stack === stack,
        };
      }
    });
    expect(result).toEqual({
      throwExpected: true,
      errMessage: "OMG",
      stackEquals: true,
    });
  });

  test("can forward an async function error", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose(
        {
          async throwError() {
            throw new Error("Should have thrown");
          },
        },
        port2
      );
      try {
        await thing.throwError();
      } catch (err) {
        return {
          errMessage: err.message,
        };
      }
    });
    expect(result).toEqual({
      errMessage: "Should have thrown",
    });
  });

  test("can rethrow non-error objects", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose((_) => {
        throw { test: true };
      }, port2);
      try {
        await thing();
        throw "Should have thrown";
      } catch (err) {
        return {
          throwExpected: err !== "Should have thrown",
          errTest: err.test,
        };
      }
    });
    expect(result).toEqual({
      throwExpected: true,
      errTest: true,
    });
  });

  test("can rethrow scalars", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose((_) => {
        throw "oops";
      }, port2);
      try {
        await thing();
        throw "Should have thrown";
      } catch (err) {
        return {
          throwExpected: err !== "Should have thrown",
          errMessage: err,
          errType: typeof err,
        };
      }
    });
    expect(result).toEqual({
      throwExpected: true,
      errMessage: "oops",
      errType: "string",
    });
  });

  test("can rethrow null", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose((_) => {
        throw null;
      }, port2);
      try {
        await thing();
        throw "Should have thrown";
      } catch (err) {
        return {
          throwExpected: err !== "Should have thrown",
          errMessageIsNull: err === null,
          errType: typeof err,
        };
      }
    });
    expect(result).toEqual({
      throwExpected: true,
      errMessageIsNull: true,
      errType: "object",
    });
  });

  test("can work with parameterized functions", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose((a, b) => a + b, port2);
      return await thing(1, 3);
    });
    expect(result).toEqual(4);
  });

  test("can work with functions that return promises", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose(
        (_) => new Promise((resolve) => setTimeout((_) => resolve(4), 100)),
        port2
      );
      return await thing();
    });
    expect(result).toEqual(4);
  });

  test("can work with classes", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, SampleClass, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose(SampleClass, port2);
      const instance = await new thing();
      return await instance.method();
    });
    expect(result).toEqual(4);
  });

  test("can pass parameters to class constructor", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, SampleClass, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose(SampleClass, port2);
      const instance = await new thing(23);
      return await instance.counter;
    });
    expect(result).toEqual(23);
  });

  test("can access a class in an object", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, SampleClass, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose({ SampleClass }, port2);
      const instance = await new thing.SampleClass();
      return await instance.method();
    });
    expect(result).toEqual(4);
  });

  test("can work with class instance properties", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, SampleClass, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose(SampleClass, port2);
      const instance = await new thing();
      return await instance._counter;
    });
    expect(result).toEqual(1);
  });

  test("can set class instance properties", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, SampleClass, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose(SampleClass, port2);
      const instance = await new thing();
      const v1 = await instance._counter;
      await (instance._counter = 4);
      const v2 = await instance._counter;
      return { v1, v2 };
    });
    expect(result).toEqual({
      v1: 1,
      v2: 4,
    });
  });

  test("can work with class instance methods", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, SampleClass, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose(SampleClass, port2);
      const instance = await new thing();
      const v1 = await instance.counter;
      await instance.increaseCounter();
      const v2 = await instance.counter;
      return { v1, v2 };
    });
    expect(result).toEqual({
      v1: 1,
      v2: 2,
    });
  });

  test("can handle throwing class instance methods", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, SampleClass, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose(SampleClass, port2);
      const instance = await new thing();
      return await instance
        .throwsAnError()
        .then((_) => Promise.reject())
        .catch((err) => {});
    });
    expect(result).toBeUndefined();
  });

  test("can work with class instance methods multiple times", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, SampleClass, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose(SampleClass, port2);
      const instance = await new thing();
      const v1 = await instance.counter;
      await instance.increaseCounter();
      await instance.increaseCounter(5);
      const v2 = await instance.counter;
      return { v1, v2 };
    });
    expect(result).toEqual({
      v1: 1,
      v2: 7,
    });
  });

  test("can work with class instance methods that return promises", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, SampleClass, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose(SampleClass, port2);
      const instance = await new thing();
      return await instance.promiseFunc();
    });
    expect(result).toEqual(4);
  });

  test("can work with class instance properties that are promises", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, SampleClass, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose(SampleClass, port2);
      const instance = await new thing();
      return await instance._promise;
    });
    expect(result).toEqual(4);
  });

  test("can work with class instance getters that are promises", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, SampleClass, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose(SampleClass, port2);
      const instance = await new thing();
      return await instance.promise;
    });
    expect(result).toEqual(4);
  });

  test("can work with static class properties", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, SampleClass, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose(SampleClass, port2);
      return await thing.SOME_NUMBER;
    });
    expect(result).toEqual(4);
  });

  test("can work with static class methods", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, SampleClass, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose(SampleClass, port2);
      return await thing.ADD(1, 3);
    });
    expect(result).toEqual(4);
  });

  test("can work with bound class instance methods", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, SampleClass, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose(SampleClass, port2);
      const instance = await new thing();
      const v1 = await instance.counter;
      const method = instance.increaseCounter.bind(instance);
      await method();
      const v2 = await instance.counter;
      return { v1, v2 };
    });
    expect(result).toEqual({ v1: 1, v2: 2 });
  });

  test("can work with class instance getters", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, SampleClass, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose(SampleClass, port2);
      const instance = await new thing();
      const v1 = await instance.counter;
      await instance.increaseCounter();
      const v2 = await instance.counter;
      return { v1, v2 };
    });
    expect(result).toEqual({ v1: 1, v2: 2 });
  });

  test("can work with class instance setters", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, SampleClass, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose(SampleClass, port2);
      const instance = await new thing();
      const v1 = await instance._counter;
      await (instance.counter = 4);
      const v2 = await instance._counter;
      return { v1, v2 };
    });
    expect(result).toEqual({ v1: 1, v2: 4 });
  });

  test("will work with BroadcastChannel", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink } = window.testData;
      const b1 = new BroadcastChannel("comlink_bc_test");
      const b2 = new BroadcastChannel("comlink_bc_test");
      const thing = Comlink.wrap(b1);
      Comlink.expose((b) => 40 + b, b2);
      return await thing(2);
    });
    expect(result).toEqual(42);
  });

  test("will transfer buffers", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose((b) => b.byteLength, port2);
      const buffer = new Uint8Array([1, 2, 3]).buffer;
      const result = await thing(Comlink.transfer(buffer, [buffer]));
      const byteLength = buffer.byteLength;
      return { result, byteLength };
    });
    expect(result).toEqual({ result: 3, byteLength: 0 });
  });

  test("will copy TypedArrays", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose((b) => b, port2);
      const array = new Uint8Array([1, 2, 3]);
      const receive = await thing(array);
      const sameArray = array === receive;
      const sameByteLength = array.byteLength === receive.byteLength;
      const array1 = [...array];
      const array2 = [...receive];
      return { sameArray, sameByteLength, array1, array2 };
    });
    expect(result).toEqual({
      sameArray: false,
      sameByteLength: true,
      array1: [1, 2, 3],
      array2: [1, 2, 3],
    });
  });

  test("will copy nested TypedArrays", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose((b) => b, port2);
      const array = new Uint8Array([1, 2, 3]);
      const receive = await thing({
        v: 1,
        array,
      });
      const sameArray = array === receive.array;
      const sameByteLength = array.byteLength === receive.array.byteLength;
      const array1 = [...array];
      const array2 = [...receive.array];
      return { sameArray, sameByteLength, array1, array2 };
    });
    expect(result).toEqual({
      sameArray: false,
      sameByteLength: true,
      array1: [1, 2, 3],
      array2: [1, 2, 3],
    });
  });

  test("will transfer deeply nested buffers", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose((a) => a.b.c.d.byteLength, port2);
      const buffer = new Uint8Array([1, 2, 3]).buffer;
      const result = await thing(
        Comlink.transfer({ b: { c: { d: buffer } } }, [buffer])
      );
      const byteLength = buffer.byteLength;
      return { result, byteLength };
    });
    expect(result).toEqual({
      result: 3,
      byteLength: 0,
    });
  });

  test("will transfer a message port", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1: firstPort1, port2: firstPort2 } = window.testData;
      const thing = Comlink.wrap(firstPort1);
      Comlink.expose((a) => a.postMessage("ohai"), firstPort2);
      const { port1: secondPort1, port2: secondPort2 } = new MessageChannel();
      await thing(Comlink.transfer(secondPort2, [secondPort2]));
      return new Promise((resolve) => {
        secondPort1.onmessage = (event) => {
          resolve({
            data: "ohai",
          });
        };
      });
    });
    expect(result).toEqual({
      data: "ohai",
    });
  });

  test("will wrap marked return values", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose(
        (_) =>
          Comlink.proxy({
            counter: 0,
            inc() {
              this.counter += 1;
            },
          }),
        port2
      );
      const obj = await thing();
      const v1 = await obj.counter;
      await obj.inc();
      const v2 = await obj.counter;
      return { v1, v2 };
    });
    expect(result).toEqual({ v1: 0, v2: 1 });
  });

  test("will wrap marked return values from class instance methods", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, SampleClass, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose(SampleClass, port2);
      const instance = await new thing();
      const obj = await instance.proxyFunc();
      const v1 = await obj.counter;
      await obj.inc();
      const v2 = await obj.counter;
      return { v1, v2 };
    });
    expect(result).toEqual({ v1: 0, v2: 1 });
  });

  test("will wrap marked parameter values", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      const local = {
        counter: 0,
        inc() {
          this.counter++;
        },
      };
      Comlink.expose(async function (f) {
        await f.inc();
      }, port2);
      const v1 = local.counter;
      await thing(Comlink.proxy(local));
      const v2 = await local.counter;
      return { v1, v2 };
    });
    expect(result).toEqual({ v1: 0, v2: 1 });
  });

  test("will wrap marked assignments", async ({ page }) => {
    const result = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const { Comlink, port1, port2 } = window.testData;
        const thing = Comlink.wrap(port1);
        const obj = {
          onready: null,
          call() {
            this.onready();
          },
        };
        Comlink.expose(obj, port2);

        thing.onready = Comlink.proxy(() => resolve({ done: true }));
        thing.call();
      });
    });
    expect(result).toEqual({ done: true });
  });

  test("will wrap marked parameter values, simple function", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose(async function (f) {
        await f();
      }, port2);
      return new Promise(async (resolve) => {
        thing(Comlink.proxy((_) => resolve({ done: true })));
      });
    });
    expect(result).toEqual({ done: true });
  });

  test("will wrap multiple marked parameter values, simple function", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose(async function (f1, f2, f3) {
        return (await f1()) + (await f2()) + (await f3());
      }, port2);
      return await thing(
        Comlink.proxy((_) => 1),
        Comlink.proxy((_) => 2),
        Comlink.proxy((_) => 3)
      );
    });
    expect(result).toEqual(6);
  });

  test("will proxy deeply nested values", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      const obj = {
        a: {
          v: 4,
        },
        b: Comlink.proxy({
          v: 5,
        }),
      };
      Comlink.expose(obj, port2);

      const a = await thing.a;
      const b = await thing.b;
      const result = [];
      result.push(await a.v);
      result.push(await b.v);
      await (a.v = 8);
      await (b.v = 9);
      // Workaround for a weird scheduling inconsistency in Firefox.
      // This test failed, but not when run in isolation, and only
      // in Firefox. I think there might be problem with task ordering.
      await new Promise((resolve) => setTimeout(resolve, 1));
      result.push(await thing.a.v);
      result.push(await thing.b.v);
      return result;
    });
    expect(result).toEqual([4, 5, 4, 9]);
  });

  test("will handle undefined parameters", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose({ f: (_) => 4 }, port2);
      return await thing.f(undefined);
    });
    expect(result).toEqual(4);
  });

  test("can handle destructuring", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      Comlink.expose(
        {
          a: 4,
          get b() {
            return 5;
          },
          c() {
            return 6;
          },
        },
        port2
      );
      const { a, b, c } = Comlink.wrap(port1);
      return [await a, await b, await c()];
    });
    expect(result).toEqual([4, 5, 6]);
  });

  test("lets users define transfer handlers", async ({ page }) => {
    const result = await page.evaluate(async () => {
      return new Promise(function (resolve) {
        const {
          Comlink,
          port1: firstPort1,
          port2: firstPort2,
        } = window.testData;
        Comlink.transferHandlers.set("event", {
          canHandle(obj) {
            return obj instanceof Event;
          },
          serialize(obj) {
            return [obj.data, []];
          },
          deserialize(data) {
            return new MessageEvent("message", { data });
          },
        });

        Comlink.expose((ev) => {
          // expect(ev).to.be.an.instanceOf(Event);
          // expect(ev.data).to.deep.equal({ a: 1 });
          resolve({
            isInstanceOfEvent: ev instanceof Event,
            data: ev.data,
          });
        }, firstPort1);
        const thing = Comlink.wrap(firstPort2);

        const { port1: secondPort1, port2: secondPort2 } = new MessageChannel();
        secondPort1.addEventListener("message", thing.bind(this));
        secondPort1.start();
        secondPort2.postMessage({ a: 1 });
      });
    });
    expect(result).toEqual({
      isInstanceOfEvent: true,
      data: { a: 1 },
    });
  });

  test("can tunnels a new endpoint with createEndpoint", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      Comlink.expose(
        {
          a: 4,
          c() {
            return 5;
          },
        },
        port2
      );
      const proxy = Comlink.wrap(port1);
      const otherEp = await proxy[Comlink.createEndpoint]();
      const otherProxy = Comlink.wrap(otherEp);
      return [
        await otherProxy.a,
        await proxy.a,
        await otherProxy.c(),
        await proxy.c(),
      ];
    });
    expect(result).toEqual([4, 4, 5, 5]);
  });

  test("released proxy should no longer be useable and throw an exception", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, SampleClass, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1);
      Comlink.expose(SampleClass, port2);
      const instance = await new thing();
      await instance[Comlink.releaseProxy]();
      try {
        instance.method();
      } catch {
        return { threwError: true };
      }
    });
    expect(result).toEqual({ threwError: true });
  });

  test("released proxy should invoke finalizer", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      let finalized = false;
      Comlink.expose(
        {
          a: "thing",
          [Comlink.finalizer]: () => {
            finalized = true;
          },
        },
        port2
      );
      const instance = Comlink.wrap(port1);
      const value = await instance.a;
      await instance[Comlink.releaseProxy]();
      // wait a beat to let the events process
      await new Promise((resolve) => setTimeout(resolve, 1));
      return {
        value,
        finalized,
      };
    });
    expect(result).toEqual({
      value: "thing",
      finalized: true,
    });
  });

  /*
  // commented out this test as it could be unreliable in various browsers as
  // it has to wait for GC to kick in which could happen at any timing
  // this does seem to work when testing locally
  it.skip("released proxy via GC should invoke finalizer", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
    let finalized = false;
    Comlink.expose(
      {
        a: "thing",
        [Comlink.finalizer]: () => {
          finalized = true;
        },
      },
      port2
    );

    let registry;

    // set a long enough timeout to wait for a garbage collection
    this.timeout(10000);
    // promise will resolve when the proxy is garbage collected
    await new Promise(async (resolve, reject) => {
      registry = new FinalizationRegistry((heldValue) => {
        heldValue();
      });

      const instance = Comlink.wrap(port1);
      registry.register(instance, resolve);
      expect(await instance.a).to.equal("thing");
    });
    // wait a beat to let the events process
    await new Promise((resolve) => setTimeout(resolve, 1));
    expect(finalized).to.be.true;
    });
    expect(result).toEqual({
    });
  });
*/

  test("can proxy with a given target", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1, { value: {} });
      Comlink.expose({ value: 4 }, port2);
      return await thing.value;
    });
    expect(result).toEqual(4);
  });

  test("can handle unserializable types", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { Comlink, port1, port2 } = window.testData;
      const thing = Comlink.wrap(port1, { value: {} });
      Comlink.expose({ value: () => "boom" }, port2);

      try {
        await thing.value;
      } catch (err) {
        return {
          errMessage: err.message,
        };
      }
    });
    expect(result).toEqual({
      errMessage: "Unserializable return value",
    });
  });
});
