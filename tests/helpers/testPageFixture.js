import { test as base, expect } from "@playwright/test";
import { TestPage } from "./testPage.js";

const test = base.extend({
  testPage: async ({ page }, use) => {
    const testPage = new TestPage(page);
    await testPage.goto();
    await use(testPage);
  },
});

export { test, expect };
