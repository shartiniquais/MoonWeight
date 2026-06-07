import {
  createWeightEntryInputSchema,
  updateWeightEntryInputSchema,
  type ApiError,
} from "@moonweight/shared";
import { Hono } from "hono";

import {
  createWeightEntry,
  deleteWeightEntry,
  getWeightEntry,
  listWeightEntries,
  updateWeightEntry,
} from "../repositories/weights.js";
import { buildWeightStats } from "../services/stats.js";

export const weightsRoutes = new Hono();

const readJson = async (request: Request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

weightsRoutes.get("/weights", async (c) => {
  const entries = await listWeightEntries();
  return c.json(entries);
});

weightsRoutes.post("/weights", async (c) => {
  const body = await readJson(c.req.raw);
  const parsed = createWeightEntryInputSchema.safeParse(body);

  if (!parsed.success) {
    return c.json<ApiError>(
      {
        error: "Invalid weight entry",
        details: parsed.error.flatten(),
      },
      400,
    );
  }

  const entry = await createWeightEntry(parsed.data);
  return c.json(entry, 201);
});

weightsRoutes.get("/weights/:id", async (c) => {
  const entry = await getWeightEntry(c.req.param("id"));

  if (!entry) {
    return c.json<ApiError>({ error: "Weight entry not found" }, 404);
  }

  return c.json(entry);
});

weightsRoutes.patch("/weights/:id", async (c) => {
  const body = await readJson(c.req.raw);
  const parsed = updateWeightEntryInputSchema.safeParse(body);

  if (!parsed.success) {
    return c.json<ApiError>(
      {
        error: "Invalid weight entry update",
        details: parsed.error.flatten(),
      },
      400,
    );
  }

  const entry = await updateWeightEntry(c.req.param("id"), parsed.data);

  if (!entry) {
    return c.json<ApiError>({ error: "Weight entry not found" }, 404);
  }

  return c.json(entry);
});

weightsRoutes.delete("/weights/:id", async (c) => {
  const deleted = await deleteWeightEntry(c.req.param("id"));

  if (!deleted) {
    return c.json<ApiError>({ error: "Weight entry not found" }, 404);
  }

  return c.body(null, 204);
});

weightsRoutes.get("/stats", async (c) => {
  const entries = await listWeightEntries();
  return c.json(buildWeightStats(entries));
});
