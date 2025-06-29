export class TestPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  async goto(name = "empty.html") {
    const { page } = this;
    await page.goto(`/${name}`);
  }

  async addComlinkImport() {
    const { page } = this;
    await page.addScriptTag({
      content: `
import * as Comlink from "./dist/comlink.mjs"      
window.testData = {
  Comlink,
};`,
      type: "module",
    });
    await page.waitForFunction(() => {
      return window.testData !== undefined;
    });
  }
}
