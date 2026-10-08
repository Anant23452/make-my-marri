import { cp, mkdir, writeFile, symlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import { createRequire } from "node:module";
import path from "node:path";

createRequire(import.meta.url)("@next/env").loadEnvConfig(process.cwd());
const root = process.cwd();
const directory = path.join(root, ".next", "email-suite");
const base = "http://localhost:3002";
const env = { ...process.env, EMAIL_DELIVERY_MODE: "preview", BETTER_AUTH_URL: base };
await mkdir(directory, { recursive: true });
for (const name of ["src", "public", "package.json", "tsconfig.json", "postcss.config.mjs"]) {
  await cp(path.join(root, name), path.join(directory, name), { recursive: true });
}
await writeFile(path.join(directory, "next.config.ts"), `export default { turbopack: { root: ${JSON.stringify(root)} } };\n`);
await symlink(path.join(root, "node_modules"), path.join(directory, "node_modules"), "junction").catch(error => { if (error.code !== "EEXIST") throw error; });
const server = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "dev", directory, "--port", "3002"], { env, stdio: ["ignore", "pipe", "pipe"] });
let serverOutput = "";
server.stdout.on("data", chunk => { serverOutput += chunk; });
server.stderr.on("data", chunk => { serverOutput += chunk; });
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: "inherit", env });
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolve() : reject(new Error(`Test exited ${code}: ${args.join(" ")}`)));
  });
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const response = await fetch(`${base}/dev/mailbox`, { signal: AbortSignal.timeout(5000) }).catch(() => null);
    if (response && (await response.text()).includes("<h1>Local testing inbox</h1>")) { ready = true; break; }
    if (server.exitCode !== null) throw new Error(`Isolated test server stopped: ${serverOutput}`);
    await setTimeout(1000);
  }
  if (!ready) throw new Error(`Isolated preview server unavailable: ${serverOutput}`);
  console.log("Isolated local preview server ready; main app configuration unchanged.");
  await run(["scripts/test-auth.mjs"]);
  await run(["tests/wedding-onboarding.integration.mjs"]);
  await run(["tests/family-invitations.integration.mjs"]);
  await run(["tests/email-preview.test.mjs"]);
  console.log("All existing local test suites passed.");
} finally {
  server.kill();
  console.log("Isolated test server stopped. Main app remains in its original email mode.");
}
