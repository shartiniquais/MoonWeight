import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  const local = loadEnv(mode, fileURLToPath(new URL("../../", import.meta.url)), "API_");
  const apiPort = process.env.PORT ?? process.env.API_PORT ?? local.API_PORT ?? "3001";
  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            charts: ["recharts"],
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": `http://127.0.0.1:${apiPort}`,
      },
    },
  };
});
