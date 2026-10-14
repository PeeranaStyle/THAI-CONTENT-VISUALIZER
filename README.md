# Thai Content Visualizer

Learnloom is a Thai-first learning workspace for private lesson materials, AI-generated quizzes, cited knowledge graphs, and saved study notes. The application uses the project name **Thai Content Visualizer** in its database and package metadata.

## Stack

- Next.js App Router, React, TypeScript, and Tailwind CSS
- Supabase PostgreSQL and private Storage buckets
- Custom Argon2id username/password accounts and hashed opaque sessions (Supabase Auth is not used)
- KKU IntelSphere through its OpenAI-compatible chat completions API
- React Flow with Dagre layout; Recharts-ready learning data views

## Local setup

1. Use Node.js 22 or a current supported LTS release.
2. Copy `.env.example` to `.env.local` and add credentials from your own Supabase and KKU IntelSphere projects. Keep service-role, AI, and session secrets server-side.
3. Apply `supabase/migrations/20261014000000_initial_schema.sql` to a new Supabase project using the Supabase CLI or SQL editor. This creates the custom account tables, ownership constraints, storage buckets, and service-role-only RPC functions. Do not enable Supabase Auth for this application.
4. Install dependencies with `npm install`.
5. Start the local server with `npm run dev`.

Set `SESSION_SECRET` to a randomly generated value of at least 32 bytes. IntelSphere model availability and account access depend on the provider account; `gemini-2.5-flash-lite` is configurable through `INTELSPHERE_MODEL`.

## Checks

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

Live registration, private Storage, IntelSphere generation, and the full persisted learning journey require the operator's configured external credentials. No external credentials are shipped in `.env.example`.

See [PLAN.md](./PLAN.md), [PROGRESS.md](./PROGRESS.md), [DECISIONS.md](./DECISIONS.md), and [TESTING.md](./TESTING.md) for implementation and verification notes.
# THAI-CONTENT-VISUALIZER
