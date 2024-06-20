import * as Comlink from "comlink";
import { Calculator } from "./types";

async function main() {
  const ifr = document.querySelector("iframe");
  if (!ifr) {
    throw new Error("iframe not found");
  }
  await new Promise((resolve) => (ifr.onload = resolve));
  const api = Comlink.wrap<Calculator>(
    Comlink.windowEndpoint(ifr.contentWindow as Window)
  );
  const sum = await api.add(2, 3);
  document.getElementById(
    "sum"
  )!.textContent = `sum: 2 + 3 = ${sum.toString()}`;
  const product = await api.multiply(2, 3);
  document.getElementById(
    "product"
  )!.textContent = `product: 2 * 3 = ${product.toString()}`;

  // demo callback
  const fibCallback = (ret: number) => {
    document.getElementById(
      "fibonacci"
    )!.textContent = `fibonacci(10): ${ret.toString()}`;
  };
  await api.fibonacci(10, Comlink.proxy(fibCallback));
}
main();
