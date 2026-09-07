import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { createWriteStream } from "node:fs";
import { createConnection } from "node:net";

// Finite QA workflow. Reuses an existing server, otherwise owns and cleans up
// only the temporary Next process it creates. Never leaves a server running.
const require = createRequire(import.meta.url);
const ready = () => new Promise((resolve) => {
  const socket = createConnection({ host: "127.0.0.1", port: 3005 });
  const finish = (connected) => { socket.destroy(); resolve(connected); };
  socket.setTimeout(1500, () => finish(false));
  socket.once("connect", () => finish(true));
  socket.once("error", () => finish(false));
});
let server;
let test;
const log = createWriteStream("features/ui-polish-2026-09-06/qa-server.log");
const stop = (process) => {
  if (!process?.pid || process.exitCode !== null) return;
  if (globalThis.process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(process.pid), "/t", "/f"], { stdio: "ignore", timeout: 5000 });
  } else process.kill("SIGTERM");
};
const deadline = setTimeout(() => {
  stop(test);
  stop(server);
  console.error("QA workflow reached its 210-second deadline");
  process.exitCode = 1;
}, 210_000);
try {
  if (!(await ready())) {
    server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--turbopack", "-H", "127.0.0.1", "-p", "3005"], { cwd: "apps/web", stdio: ["ignore", "pipe", "pipe"] });
    server.stdout.pipe(log, { end: false });
    server.stderr.pipe(log, { end: false });
    let available = false;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (server.exitCode !== null) throw new Error(`Temporary server exited ${server.exitCode}`);
      if (await ready()) { available = true; break; }
      await delay(1000);
    }
    if (!available) throw new Error("Temporary server did not become ready");
  }
  test = spawn(process.execPath, [process.argv[2] ?? "features/ui-polish-2026-09-06/verify.mjs"], { stdio: "inherit" });
  process.exitCode = await new Promise((resolve, reject) => {
    test.on("error", reject);
    test.on("exit", (code) => resolve(code ?? 1));
  });
} finally {
  clearTimeout(deadline);
  stop(test);
  stop(server);
  log.end();
}
