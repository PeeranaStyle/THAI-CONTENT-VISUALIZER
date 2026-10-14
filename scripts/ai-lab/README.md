# IntelSphere AI lab

Run these commands from the project root. Quiz and graph integration tests invoke the same `generateQuiz` and `generateGraph` production wrappers used by their API routes; they make real IntelSphere requests, but do not start Next.js, authenticate to the app, or connect to Supabase. The direct low-level requests are limited to connection and format diagnostics.

```sh
npm run ai:test:connection
npm run ai:test:quiz
npm run ai:test:graph
npm run ai:test:graph:markdown
npm run ai:test:quiz:markdown
npm run ai:test:all
```

The runner reads server-side values from `.env.local`, uses `INTELSPHERE_MODEL` (default `gemini-3.8-flash`), and never prints the API key. It writes metrics and validated synthetic outputs under `scripts/ai-lab/results/`, which is ignored by Git. Every test calls the real provider and consumes account quota. `ai:test:all` runs multiple completions. For a targeted PowerShell run, set the quiz count and fixture before invoking the command:

```powershell
$env:AI_LAB_COUNTS = '3'
$env:AI_LAB_FIXTURE = 'short'
npm run ai:test:quiz
```

Output-budget probes can be narrowed with `$env:AI_LAB_MAX_TOKENS = '8192'`.

Fixtures are synthetic and may be saved with generated results. Never place private lesson material in this directory.
