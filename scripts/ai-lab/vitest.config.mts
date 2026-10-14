import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: { environment: "node", include: ["scripts/ai-lab/ai-lab.test.ts", "scripts/ai-lab/routes.test.ts", "src/lib/ai/*.test.ts", "src/lib/ai/*.test.tsx"], fileParallelism: false },
  resolve: { alias: {
    "@": fileURLToPath(new URL("../../src", import.meta.url)),
    "server-only": fileURLToPath(new URL("./server-only.ts", import.meta.url)),
  } },
});
