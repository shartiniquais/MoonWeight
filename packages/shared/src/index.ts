import { z } from "zod";

export const MAX_NOTE_LENGTH = 500;

const validDateString = z
  .string()
  .min(1, "Date is required")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Date must be valid");

const createOptionalNote = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z.string().max(MAX_NOTE_LENGTH, `Note must be ${MAX_NOTE_LENGTH} characters or less`).optional(),
);

const updateOptionalNote = z.preprocess(
  (value) => {
    if (value === null) {
      return null;
    }

    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  },
  z
    .union([z.string().max(MAX_NOTE_LENGTH, `Note must be ${MAX_NOTE_LENGTH} characters or less`), z.null()])
    .optional(),
);

export const createWeightEntryInputSchema = z.object({
  weightKg: z.coerce
    .number({
      invalid_type_error: "Weight must be a number",
    })
    .positive("Weight must be greater than 0")
    .max(1000, "Weight must be below 1000 kg"),
  date: validDateString,
  note: createOptionalNote,
});

export const updateWeightEntryInputSchema = z
  .object({
    weightKg: z.coerce
      .number({
        invalid_type_error: "Weight must be a number",
      })
      .positive("Weight must be greater than 0")
      .max(1000, "Weight must be below 1000 kg")
      .optional(),
    date: validDateString.optional(),
    note: updateOptionalNote,
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "At least one field must be provided",
  });

export const loginInputSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export type CreateWeightEntryInput = z.infer<typeof createWeightEntryInputSchema>;
export type UpdateWeightEntryInput = z.infer<typeof updateWeightEntryInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;

export type WeightEntry = {
  id: string;
  weightKg: number;
  date: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type WeightStats = {
  latest: WeightEntry | null;
  deltaPreviousKg: number | null;
  delta7DaysKg: number | null;
  delta30DaysKg: number | null;
  lowestWeightKg: number | null;
  highestWeightKg: number | null;
  totalEntries: number;
};

export type WeightUnit = "kg" | "lb";

export type AppSettings = {
  unit: WeightUnit;
  targetWeightKg?: number;
};

export type AuthStatus = {
  authenticated: boolean;
};

export type ApiError = {
  error: string;
  details?: unknown;
};
