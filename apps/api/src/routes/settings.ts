import { settingsInputSchema } from "@moonweight/shared";
import { Hono } from "hono";
import { getSettings, saveSettings } from "../repositories/settings.js";

export const settingsRoutes = new Hono();
settingsRoutes.get("/settings", async (c) => c.json(await getSettings()));
settingsRoutes.put("/settings", async (c) => {
  const parsed = settingsInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success)
    return c.json({ error: "Invalid settings", details: parsed.error.flatten() }, 400);
  return c.json(await saveSettings(parsed.data));
});
