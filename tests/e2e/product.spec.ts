import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { previewCsv, type WeightEntry } from "@moonweight/shared";

const login = async (page: Page) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("Configure .env before running browser smoke tests.");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "The longer view" })).toBeVisible();
  const entries = (await (await page.request.get("/api/weights")).json()) as WeightEntry[];
  if (
    !entries.some((entry) => entry.note?.includes("[DEMO]")) ||
    entries.some((entry) => entry.note && !entry.note.includes("[DEMO]"))
  ) {
    throw new Error("Browser tests require an isolated tracker seeded with fictional demo data.");
  }
};
const noOverflow = async (page: Page) =>
  expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);

test("accessible sign-in, dashboard and dialog keyboard focus", async ({ page }) => {
  await page.goto("/");
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
      .violations,
  ).toEqual([]);
  await login(page);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
      .violations,
  ).toEqual([]);
  const edit = page.getByRole("button", { name: /Edit entry/ }).first();
  await edit.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("spinbutton", { name: /^Weight/ })).toBeFocused();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(edit).toBeFocused();
});

test("login → create → refresh → edit → delete → logout", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  const initialCount = ((await (await page.request.get("/api/weights")).json()) as WeightEntry[])
    .length;
  const note = `[DEMO] Browser smoke ${Date.now()} ${"x".repeat(450)}`;
  let createdId: string | undefined;
  try {
    await page.getByRole("spinbutton", { name: /^Weight/ }).fill("79.12");
    await page.getByLabel("Note", { exact: false }).fill(note);
    await page.getByRole("button", { name: "Add entry", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Reading added");
    let entries = (await (await page.request.get("/api/weights")).json()) as WeightEntry[];
    const created = entries.find((entry) => entry.note === note)!;
    createdId = created.id;
    expect(entries.length).toBe(initialCount + 1);
    await expect(page.locator(".latest-number")).toContainText("79.1");
    await noOverflow(page);
    await page.reload();
    await expect(page.getByRole("heading", { name: "The longer view" })).toBeVisible();
    await page.getByLabel("Search history").fill(note);
    const row = page.getByRole("article").filter({ hasText: note });
    await row.getByRole("button", { name: /Edit entry/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("spinbutton", { name: /^Weight/ }).fill("78.91");
    await dialog.getByLabel("Note", { exact: false }).fill(note + " edited");
    await dialog.getByRole("button", { name: "Save changes" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator(".latest-number")).toContainText("78.9");
    await row.getByRole("button", { name: /Delete entry/ }).click();
    await expect(page.getByRole("dialog", { name: "Delete this reading?" })).toBeVisible();
    await page.getByRole("button", { name: "Keep entry" }).click();
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: /Delete entry/ }).click();
    await page.getByRole("button", { name: "Delete entry", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByText("No matching entries.")).toBeVisible();
    entries = (await (await page.request.get("/api/weights")).json()) as WeightEntry[];
    expect(entries.length).toBe(initialCount);
    createdId = undefined;
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Password")).toBeVisible();
    expect((await page.request.get("/api/weights")).status()).toBe(401);
    expect(errors).toEqual([]);
  } finally {
    if (createdId)
      await page.request.delete(`/api/weights/${createdId}`, {
        headers: { "Content-Type": "application/json" },
      });
  }
});

test("preferences, chart ranges, CSV preview, export and responsive layout", async ({ page }) => {
  await login(page);
  const previous = (await (await page.request.get("/api/settings")).json()) as {
    unit: string;
    targetWeightKg: number | null;
  };
  const importNote = `[DEMO] CSV smoke ${Date.now()}`;
  try {
    await page.getByRole("button", { name: "Preferences" }).click();
    await page.getByRole("radio", { name: /Pounds/ }).check();
    await page.getByLabel("Target weight").fill("167.55");
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.locator(".latest-number")).toContainText("lb");
    for (const range of ["7 days", "30 days", "3 months", "All time"]) {
      await page.getByRole("button", { name: range, exact: true }).click();
      await expect(page.getByRole("button", { name: range, exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    }
    await noOverflow(page);
    await page.getByRole("button", { name: "Import", exact: true }).click();
    await page.locator("#csv-file").setInputFiles({
      name: "fictional-preview.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        `date,weight_kg,note\n2025-02-30,78,invalid date\n2025-01-01,78,${importNote}\n2025-01-01,78,${importNote}\n`,
      ),
    });
    await expect(page.getByText("1 ready", { exact: true })).toBeVisible();
    await expect(page.getByText("1 duplicates skipped", { exact: false })).toBeVisible();
    await expect(page.getByText("1 rejected", { exact: false })).toBeVisible();
    await noOverflow(page);
    await page.getByRole("button", { name: "Import 1 ready entry", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByRole("status")).toContainText("1 entries imported");
    const imported = (await (await page.request.get("/api/weights")).json()) as WeightEntry[];
    expect(imported.find((entry) => entry.note === importNote)).toMatchObject({
      date: "2025-01-01",
      weightKg: 78,
    });
    const downloadEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    const download = await downloadEvent;
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    const csv = Buffer.concat(chunks).toString("utf8");
    expect(previewCsv(csv).every((row) => !row.error)).toBe(true);
    expect(csv.startsWith("date,weight_kg,note")).toBe(true);
    for (const width of [360, 768, 1024, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      await noOverflow(page);
    }
  } finally {
    await page.request.put("/api/settings", { data: previous });
    const entries = (await (await page.request.get("/api/weights")).json()) as WeightEntry[];
    for (const entry of entries.filter((entry) => entry.note === importNote))
      await page.request.delete(`/api/weights/${entry.id}`, {
        headers: { "Content-Type": "application/json" },
      });
  }
});

test("failed initial load can be retried and an expired session returns to sign-in", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/api/weights", async (route) => {
    if (fail && route.request().method() === "GET")
      await route.fulfill({ status: 503, json: { error: "Temporarily unavailable" } });
    else await route.continue();
  });
  await page.goto("/");
  await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Temporarily unavailable");
  await expect(
    page.getByRole("heading", { name: "Your tracker is temporarily unavailable." }),
  ).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "The longer view" })).toBeVisible();
  await page.request.post("/api/auth/logout", { headers: { "Content-Type": "application/json" } });
  await page.getByRole("button", { name: "Refresh readings" }).click();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Your session has ended");
});
