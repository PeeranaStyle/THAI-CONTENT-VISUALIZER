import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const operation = process.argv[2] || "all";
const supported = new Set(["all", "connection", "quiz", "quiz-reliability", "graph", "graph-markdown", "quiz-markdown"]);
if (!supported.has(operation)) {
  console.error("Usage: node scripts/ai-lab/run.mjs [all|connection|quiz|quiz-reliability|graph|graph-markdown|quiz-markdown]");
  process.exit(2);
}

const vitest = resolve(root, "node_modules/vitest/vitest.mjs");
const config = resolve(root, "scripts/ai-lab/vitest.config.mts");
const child = spawn(process.execPath, [vitest, "run", "--config", config], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, AI_LAB_OPERATION: operation },
});
child.on("exit", code => process.exit(code ?? 1));
