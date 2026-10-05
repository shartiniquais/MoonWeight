import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["tests/shared/**/*.test.ts", "tests/api/**/*.test.ts", "tests/web/**/*.test.tsx"],
    setupFiles: ["tests/setup.ts"],
    environment: "node",
    restoreMocks: true,
  },
});
