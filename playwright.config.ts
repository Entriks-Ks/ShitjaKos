import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  expect: { timeout: 20000 },
  use: {
    baseURL: "http://localhost:3001",
    channel: "chrome",
    headless: true,
    trace: "retain-on-failure",
    actionTimeout: 20000,
  },
  reporter: "list",
});
