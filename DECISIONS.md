# Decisions

- Use Next.js App Router, React, TypeScript, and Tailwind CSS as required.
- Use Supabase service-role access only from server modules. Supabase Auth is excluded; custom sessions are opaque random tokens with only SHA-256 hashes stored in Postgres.
- Use a database-backed atomic rate limit for auth endpoints rather than process-local state so deployments with multiple instances share limits.
- Enforce ownership in server queries even though the service role bypasses RLS; private data tables and storage buckets also deny direct anonymous access.
- Validate AI results with Zod after using standard chat completions. Never return answer keys in quiz-taking payloads; grade and reveal answers on the server.
- Avoid fabricated dashboard metrics. Empty states reflect the signed-in user's persisted data.
- Keep graph and chart libraries out of the initial route bundle; load them only in their workspaces.
- Keep user content and credentials server-side. Uploaded lesson text is untrusted model input.
- Credentials are absent at project start. No fallback/demo account will imitate live persistence or AI.
# Implementation decisions

- Use custom Argon2id accounts and application-managed sessions. The Supabase service-role key is server-only; row ownership is applied in route queries and security-definer RPCs are granted only to `service_role`.
- Validate AI quiz and graph citations against normalized source text before saving. Store answer keys outside quiz read responses and calculate final scores in PostgreSQL.
- Keep graph nodes and edges in normalized tables and render the graph with React Flow and Dagre. Generated notes store structured content in `generated_notes.content` and export as Markdown.
- Keep `.env.example` credential-free. Provider integration must be configured by the operator in `.env.local`.
- The workspace is dynamic because its protected pages read cookies and user-scoped database records.
