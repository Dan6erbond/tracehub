<!-- intent-skills:start -->
## Skill Loading

Use the repository’s installed Intent. If it is unavailable, report the missing dependency instead of downloading a replacement.
Before editing files for a substantial task:
- Run `npm exec --no -- intent list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `npm exec --no -- intent load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

# TraceHub

Drone CI-style app for Playwright traces. Users sign in with their Git host (GitHub, Gitea, Forgejo), see the repos they have access to, and browse traces by branch in the Playwright trace viewer.

## Core flows

- **Repo access**: Better Auth OIDC against the Git host. We call the host's API with the user's token to list repos, so permissions are inherited from the host. Never keep a separate permission model.
- **Trace ingestion (primary use-case)**: agents (CI jobs, coding agents) upload traces via an HTTP API built on Convex HTTP actions, authenticated with Better Auth API keys. Treat this API as a public contract: validate every input, keep it versioned and stable.
- **Trace viewing**: repo, then branch, then trace, opened in the Playwright trace viewer. A branch page shows its active PR (fetched from the Git host, cached) and a PR view lists that PR's runs and traces.

## Data model

The trace is the atom. Everything else is metadata supplied at upload time or grouping derived from it.

- **Trace**: the uploaded zip plus test title, status, and duration. Belongs to a run.
- **Run**: a group of traces from one upload session, not necessarily a CI job. Identified by repo + commit SHA + optional `externalRunId` (e.g. Drone build number, GitHub run id, Woodpecker pipeline). CI agents pass `externalRunId` and `ciUrl`; the server upserts the run on first upload and reuses it after. Without an `externalRunId` (local agent, no CI) the server creates a run per upload batch.
- **Upload params**: `repo` (host + full name) and `sha` are required. `branch`, `prNumber`, `externalRunId`, `ciUrl`, and `jobName` are optional. A non-CI agent only needs `repo`, `sha`, and `prNumber` or `branch`.
- **PR association**: an explicit `prNumber` wins. Otherwise the branch is matched to its open PR through the Git host API when viewing. Store `prNumber` on the run when given; never make it a required field.
- **Repo access**: authorization always goes through the host's permissions. API keys are scoped to the user who created them and only accept uploads to repos that user can access.

## Stack

TanStack Start + Router + Query, Convex (DB, functions, file storage, HTTP actions), Better Auth, Zod 4, convex-helpers, Tailwind 4, ShadCN.

## Coding rules

DRY and SRP come first. This stack exists for reuse, so agents add as little technical debt as possible. Before writing anything new, search for an existing schema, query, hook, or component that already does it.

### Schemas and validation

- Define each shape once as a Zod schema in a shared module and use it for the Convex table validators, function args, HTTP action bodies, and form validation on the frontend. Derive types with `z.infer`; never re-declare them.
- Use convex-helpers Zod support (`zodToConvex`, `zCustomQuery`/`zCustomMutation`/`zCustomAction`, i.e. zQuery/zMutation) so function args and returns are validated by Zod on the backend and the same schemas validate on the frontend.
- Use convex-helpers triggers for side effects on writes (denormalization, cleanup, audit) instead of repeating them in each mutation.

### Convex functions

- One function, one responsibility. Compose them: an `updateX` reuses `getX` for lookup and access checks instead of duplicating the query logic.
- Extract shared logic (access checks, lookups, mappers) into plain helper functions taking `ctx`, and call them from queries, mutations, and HTTP actions. HTTP actions stay thin: parse, authenticate, delegate to internal functions.
- Auth and repo-permission wrappers are custom builders layered on top of the Zod builders (`zCustomQuery`/`zCustomMutation` via `customCtx`), so every function keeps Zod validation and gets auth context without repeating checks. Never build them on the plain `query`/`mutation`.
- Follow the Convex rules in `.cursorrules` (validators, indexes, function syntax).

### Frontend

- Fetch ShadCN components with the CLI (`npx shadcn@latest add <component>`); never hand-write or copy them. Use them wherever one fits: a `Card` instead of a bordered `div`, `Button`, `Badge`, `Table`, `Dialog`, and so on. No ad-hoc `div.border-2` style constructs.
- Build reusable components in `src/components` and compose them; extract when a pattern appears a second time. Keep components single-purpose and keep data fetching out of presentational components.
- Forms use TanStack Form with the shared Zod schemas. Build one app-wide form setup with `createFormHook` (`useAppForm`, `withForm`, `withFieldGroup`).
  - Share `defaultValues` and validators via `formOptions`, one per schema.
  - Register reusable fields via `createFormHook`'s `fieldComponents` (text, email, password, checkbox, select, ...), each wrapping the matching ShadCN component. Register form-level pieces such as the submit button via `formComponents`. Never render raw inputs in a form.
  - Use `withFieldGroup` for reusable field subsets (e.g. username + password). Type them from the schema (`Pick<CreateUser, 'username' | 'password'>`) so they inherit the field-type mapping.
- Use `cn()` and Tailwind tokens/theme variables; no hard-coded colors or one-off styles.

### General

- Keep files small and focused. Split when a module does more than one thing.
- Comments only where the code cannot say it: non-obvious decisions, external specs, workarounds.
- Run `npm run lint` and `npm run check` before finishing.

## Layout

- `convex/`: schema, queries, mutations, actions, HTTP routes
- `src/routes/`: TanStack Router file routes
- `src/components/`: shared UI (ShadCN in `ui/`)
- `src/lib/`: shared helpers and Zod schemas
- `src/integrations/`: third-party wiring (auth, query, Convex)
