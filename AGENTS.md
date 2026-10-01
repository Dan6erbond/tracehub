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
- **Run**: a group of traces from one upload session, not necessarily a CI job. References its pipeline and job by `pipelineId` and `jobId`; identified by repo + commit SHA + those two. CI agents pass `externalRunId`, `externalJobId`, `jobName` and `ciUrl` on upload; the server resolves them to the stored pipeline and job, creating a stub of either that the host has not reported yet (see the CI entries), and reuses the run after. Without any of them (local agent, no CI) the server creates a run per upload batch.
- **CI pipeline**: a workflow run as the Git host reports it (GitHub run id as `externalId`), synced with the repo reload (the most recent runs of any branch) with its branch (only names of known branches) and pull request. Uploads that name an unreported pipeline create a stub (no status) that the sync replaces, keeping its id. A run that states no branch or pull request adopts the pipeline's, so branch and PR views include runs uploaded for their pipelines; the run's traces follow in batches. A branch's `ciStatus` is that of its latest pipeline, falling back to the head commit's rollup.
- **CI job**: a job of a pipeline (`pipelineId`), or a commit status or check run outside any pipeline, as the Git host reports it. Keyed by repo + SHA + the host's job id (`externalId`). Jobs of branch and PR heads sync with the repo; other pipelines load their jobs once when opened. Uploads that name an unreported job create a stub (no status, no `syncedAt`); a sync replaces the stub with the same id, matching a named-only stub by name within its pipeline. Jobs that runs reference are never pruned. Traces never reference jobs directly. Links into the host's CI pages are derived from the ids and the host's URL scheme; for Gitea and Forgejo, whose run and job page numbers differ per version, the page path the host reported (relative to the repo) is stored as `webPath` and prefixed with the base URL when read. `url` on jobs and pipelines (http(s) only) only holds pages of CI outside the Git host.
- **Upload params**: `repo` (host + full name) and `sha` are required. `branch`, `prNumber`, `externalRunId`, `externalJobId`, `jobName`, and `ciUrl` are optional. A non-CI agent only needs `repo`, `sha`, and `prNumber` or `branch`. Pipelines are matched by `externalRunId` alone, since an upload's `sha` can be a merge commit while the host reports the head commit.
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
- Internal queries and mutations (`zInternalQuery`/`zInternalMutation`) are always the preferred shape for shared logic (lookups, mappers, counts) and are called via `ctx.runQuery`/`ctx.runMutation` from queries, mutations, actions, and HTTP actions. Performance is not a reason to fall back to a plain helper taking `ctx`; use one only when an internal function is not possible (e.g. transactions or typing prevent it) or after the user agrees to the exception. Plain helpers for `ActionCtx` that only talk to external services (Better Auth, Git hosts) are such an exception, since an internal action per call would add an action-to-action invocation. Mappers that load relations onto rows (e.g. `withOpenPullRequests`, `withTraceCounts`) are another: they are plain helpers that call internal queries, since inlining them at every call site is less DRY. HTTP actions stay thin: parse, authenticate, delegate to internal functions.
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
- After every change, run `npm run format`, `npm run lint` and `npm run check` without asking, and fix what they report before finishing.
- Run scripts via `npm run <script>` whenever one exists. Call the underlying tool directly (`npx eslint <files>`, `npx prettier <files>`) only when no script fits, e.g. to scope to a few files.
- `convex dev` is usually already running and regenerates `convex/_generated` and pushes functions on save. Assume it is running; run `npx convex dev --once` only when a push is actually needed.

## Layout

- `convex/`: schema, queries, mutations, actions, HTTP routes
- `src/routes/`: TanStack Router file routes
- `src/components/`: shared UI (ShadCN in `ui/`)
- `src/lib/`: shared helpers and Zod schemas
- `src/integrations/`: third-party wiring (auth, query, Convex)
