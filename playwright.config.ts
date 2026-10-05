import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
import { tmpdir } from "node:os";
import { join } from "node:path";
config({ quiet: true });
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 60000,
        stdout: "ignore",
        stderr: "pipe",
      },
  use: {
    // Browser downloads need a writable OS temporary folder on Windows.
    launchOptions: { downloadsPath: join(tmpdir(), "moonweight-browser-downloads") },
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 360, height: 800 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
