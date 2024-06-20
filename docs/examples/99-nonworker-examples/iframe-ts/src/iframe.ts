import * as Comlink from "comlink";
import { Calculator } from "./types";

const calculator: Calculator = {
  add(a: number, b: number) {
    return a + b;
  },
  multiply(a: number, b: number) {
    return a * b;
  },
  fibonacci: function (n: number, callback: (ret: number) => void): void {
    let a = 0;
    let b = 1;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum = a + b;
      a = b;
      b = sum;
    }
    callback(sum);
  },
};

Comlink.expose(calculator, Comlink.windowEndpoint(self.parent));
