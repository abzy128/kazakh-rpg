# Commits

Don't add `Co-Authored-By` trailers or any other AI attribution lines to commit messages in this repo.

# Project conventions (read by Claude Code and Muse Code)

- Bun + TanStack Start 1.169 (`createServerFn(...).validator(...)`, routes with `ssr: false`, API routes via `server.handlers`). React Three Fiber 9 for the game.
- API keys live only in `src/server/*`. Never prefix env vars with `VITE_`, and never import `src/server/*` from client code except server functions (`createServerFn`), which the bundler turns into RPC stubs.
- `src/game/engine` stays pure (no React, no fetch) and is shared by client and server. Add tests in `engine.test.ts`.
- Content for an era lives in `src/content/<era>/`. Prefer adding data over adding code.
- Before finishing: `bun run typecheck && bun run test`. After changing prompts or tools: `bun run eval:gm`.
- Plan and status: `docs/implementation-plan.md`. Asset licenses: `CREDITS.md`.
