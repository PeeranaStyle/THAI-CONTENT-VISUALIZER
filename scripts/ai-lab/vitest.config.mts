import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: { environment: "node", include: ["scripts/ai-lab/ai-lab.test.ts"], fileParallelism: false },
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
});
