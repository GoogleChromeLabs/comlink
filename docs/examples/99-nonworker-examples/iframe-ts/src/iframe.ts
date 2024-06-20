import * as Comlink from "comlink";
import { Calculator } from "./types";

const calculator: Calculator = {
  add(a: number, b: number) {
    return a + b;
  },
  multiply(a: number, b: number) {
    return a * b;
  },
};

// function add(a: number, b: number) {
//   return a + b;
// }

// function multiply(a: number, b: number) {
//   return a * b;
// }

Comlink.expose(calculator, Comlink.windowEndpoint(self.parent));
// Comlink.expose(multiply, Comlink.windowEndpoint(self.parent));
