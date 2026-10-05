import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const envFlag = args.indexOf("--config");
if (args.length && (args.length !== 2 || envFlag !== 0 || !args[1])) {
  console.error("Usage: npm start [-- --config .env.personal]");
  process.exit(1);
}
const envFile = resolve(root, envFlag === 0 ? args[1] : ".env");
const compose = ["compose", "--env-file", envFile];
const run = (commandArgs, inherit = false) => {
  const result = spawnSync("docker", commandArgs, {
    cwd: root,
    encoding: "utf8",
    ...(inherit ? { stdio: "inherit" } : { stdio: "pipe" }),
  });
  if (result.error || result.status !== 0) throw new Error("Docker command failed");
  return result.stdout;
};
try {
  run(["compose", "version"]);
  run(["info", "--format", "{{.ServerVersion}}"]);
} catch {
  console.error(
    "MoonWeight needs Docker with Compose. Install/start Docker Desktop, then run npm start again.",
  );
  process.exit(1);
}
if (!existsSync(envFile)) {
  const secret = () => randomBytes(32).toString("hex");
  writeFileSync(
    envFile,
    [
      "# Generated locally by npm start. Keep this file private.",
      "POSTGRES_DB=moonweight",
      "POSTGRES_USER=moonweight",
      `POSTGRES_PASSWORD=${secret()}`,
      `ADMIN_PASSWORD=${secret()}`,
      `SESSION_SECRET=${secret()}`,
      "POSTGRES_HOST=localhost",
      "POSTGRES_PORT=5432",
      "API_PORT=3001",
      "WEB_PORT=8080",
      "WEB_BIND_ADDRESS=127.0.0.1",
      "CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080",
      "COOKIE_SECURE=false",
      "",
    ].join("\n"),
    { flag: "wx", mode: 0o600 },
  );
  console.log("Created private local configuration with random secrets.");
}
try {
  const config = JSON.parse(run([...compose, "config", "--format", "json"]));
  const environment = config.services.api.environment;
  for (const [name, min] of [
    ["POSTGRES_PASSWORD", 16],
    ["ADMIN_PASSWORD", 12],
    ["SESSION_SECRET", 32],
  ]) {
    const value = environment[name];
    if (!value || value.length < min || /replace-with|change-me|your-.*password/i.test(value)) {
      console.error(
        `Set ${name} in ${envFile} (${min}+ characters), then run npm start again. Existing configuration was preserved.`,
      );
      process.exit(1);
    }
  }
  console.log("Starting MoonWeight. The first build can take a few minutes…");
  run([...compose, "up", "--build", "-d", "--wait", "--wait-timeout", "180"], true);
  const origins = environment.CORS_ORIGIN.split(",").map((value) => value.trim());
  const port = config.services.web.ports[0].published;
  const url =
    origins.find((origin) => origin === `http://localhost:${port}`) ??
    origins.find((origin) => new URL(origin).protocol === "https:") ??
    origins[0];
  const status = await fetch(new URL("/api/auth/me", url), { signal: AbortSignal.timeout(10000) })
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);
  console.log(`\nMoonWeight is running: ${url}`);
  if (status?.setupRequired) {
    console.log(`\nYour one-time setup key: ${environment.ADMIN_PASSWORD}`);
    console.log("Open the address above, paste this key, and choose your username and password.");
    console.log("Keep the key private. After account creation, it cannot be used to sign in.");
  } else if (status) {
    console.log("Sign in with your account username and password.");
  } else {
    console.log(
      `Open the app to finish setup. If asked for a setup key, use ADMIN_PASSWORD from ${envFile}.`,
    );
  }
  console.log(
    "Fresh installations start empty. Add your first reading; demo data is never loaded automatically.",
  );
  console.log(
    `Stop without deleting data: docker ${[...compose, "-p", config.name].map((value) => (/\s/.test(value) ? `"${value}"` : value)).join(" ")} stop`,
  );
} catch {
  console.error(
    `MoonWeight could not start. Check Docker, available web ports, and ${envFile}. Configuration and database volumes were preserved.`,
  );
  console.error("Inspect the service error with docker compose logs --tail 50 api.");
  console.error(
    "If the web port is occupied, change WEB_PORT and its matching CORS_ORIGIN in the configuration file.",
  );
  process.exitCode = 1;
}
