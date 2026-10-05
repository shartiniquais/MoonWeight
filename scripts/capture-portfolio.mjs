import { chromium } from "@playwright/test";
import { config } from "dotenv";
import { mkdir } from "node:fs/promises";

config({ quiet: true });
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5173";
if (!process.env.ADMIN_PASSWORD)
  throw new Error("Configure .env before capturing portfolio screenshots.");
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1180 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(baseURL);
  await page.locator(".login-form").waitFor();
  if (await page.getByRole("button", { name: "Use existing server password" }).isVisible())
    await page.getByRole("button", { name: "Use existing server password" }).click();
  await page.evaluate(() => document.fonts.ready);
  // Login is synthetic only when the tracker passes the fixture guard below.
  await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "The longer view" }).waitFor();
  const entries = await (await page.request.get(new URL("/api/weights", baseURL).href)).json();
  if (
    !entries.some((entry) => entry.note?.includes("[DEMO]")) ||
    entries.some((entry) => entry.note && !entry.note.includes("[DEMO]"))
  ) {
    throw new Error(
      "Capture refused: use a separate tracker containing only fictional demo entries.",
    );
  }
  await mkdir("docs/portfolio", { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "docs/portfolio/desktop-dashboard.png" });
  await page.getByRole("button", { name: "All time", exact: true }).click();
  await page
    .getByRole("region", { name: "Weight chart", exact: true })
    .screenshot({ path: "docs/portfolio/chart-target.png" });
  const history = page.locator("#history");
  await history.screenshot({ path: "docs/portfolio/history.png" });
  await history
    .getByRole("button", { name: /Edit entry/ })
    .first()
    .click();
  await page.getByRole("dialog").screenshot({ path: "docs/portfolio/edit-reading.png" });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 1560 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "docs/portfolio/mobile-dashboard.png" });
  await page
    .getByRole("region", { name: "Weight chart", exact: true })
    .screenshot({ path: "docs/portfolio/mobile-chart.png" });
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.locator(".login-form").waitFor();
  if (await page.getByRole("button", { name: "Use existing server password" }).isVisible())
    await page.getByRole("button", { name: "Use existing server password" }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "docs/portfolio/login.png" });
  if (errors.length) throw new Error("Browser runtime errors occurred during capture.");
  console.log("Captured seven real portfolio screenshots using fictional data.");
} finally {
  await browser.close();
}
