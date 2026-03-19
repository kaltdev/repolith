# Repository Guidelines

## Project Structure & Module Organization
This repo is a Bun workspace monorepo. `apps/web` contains the main Next.js 16 app, with routes in `src/app`, UI in `src/components`, shared logic in `src/lib`, and client hooks in `src/hooks`. Database schema and migrations live in `apps/web/prisma`, and static assets live in `apps/web/public`. Browser extensions are separate packages in `packages/chrome-extension` and `packages/firefox-extension`. Treat `apps/web/src/generated` as generated output and regenerate it instead of editing by hand.

## Build, Test, and Development Commands
Use Node `22` from `.nvmrc` and Bun `1.3.5`. Start local services with `docker compose up -d`; it brings up PostgreSQL, Redis, and the Redis REST bridge.

- `bun install`: install all workspace dependencies.
- `bun dev`: run workspace dev scripts.
- `bun build`: build every workspace; CI also runs this with `SKIP_ENV_VALIDATION=true`.
- `bun check`: run lint, format check, and TypeScript validation together.
- `bun lint`, `bun fmt`, `bun typecheck`: run individual quality gates.
- `cd apps/web && bunx prisma migrate dev`: apply local Prisma migrations.

## Documentation & Library Research
Prefer `Context7` for third-party framework and library documentation before using general web search or guessing APIs. Check the installed version in `package.json` first, resolve the library ID, and query the version-matched docs for concrete tasks such as implementation details, configuration, migrations, and breaking API changes. This is especially important for the main stack here, including Next.js `16`, React `19`, Prisma `7`, Tailwind `4`, Better Auth, TanStack Query, and Bun. If `Context7` does not cover the package well enough, fall back to the library's official docs or source code and note that gap in your response.

## Coding Style & Naming Conventions
TypeScript is strict at the workspace root. Inside `apps/web`, use the `@/*` alias for imports from `src`. Formatting is enforced by `oxfmt`: tabs, semicolons, double quotes, sorted imports, and sorted Tailwind classes. Linting is handled by `oxlint`, so run `bun fmt` and `bun lint` instead of hand-formatting. Use PascalCase for React components, camelCase for utilities and stores, and standard Next route filenames such as `page.tsx`, `layout.tsx`, and `route.ts`.

## Testing Guidelines
Tests use Bun's built-in runner (`bun:test`) and are colocated as `*.test.ts`. Run `bun test` from the repo root, or target a file such as `bun test "apps/web/src/app/(app)/repos/[owner]/[repo]/commits/actions.test.ts"`. There is no coverage gate in CI, so add focused regression tests for new server actions, utilities, and data transforms, then run `bun check` before opening a PR.

## Design Guidelines
Try to follow the design of the rest of the codebase as much as possible.
Avoid loading spinners and prefer skeleton UI for loading states.

Open PRs against `main`. Include a short description of what changed and why, link the related issue when there is one, and attach screenshots or short recordings for UI or extension changes. Call out schema, env, or migration changes explicitly.

## Agent / Documentation Planning Note
When creating documentation plans (e.g. drafts, outlines, or exploratory docs in agents.md or similar files), treat them as working documents and do not commit them to the repository unless explicitly instructed. These files are intended for internal iteration, planning, or AI-assisted workflows and should remain local or be shared externally (e.g. in discussions) instead of being merged into the codebase.
