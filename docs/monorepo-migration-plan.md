# Monorepo migration plan (Turborepo + pnpm workspaces)

Goal of this step: turn `core-web-app` into a Turborepo monorepo with **one app and no packages yet**,
with Docker, CI, Amplify and local tooling already working the monorepo way. Packages
(`@obi/entitycore`, `@obi/ui`) come in later phases and must plug in without touching the setup again.

Status: plan only. Nothing below is implemented or tested yet.

---

## 1. What the repo looks like today (measured on `094e7685e`)

| Item | Today | Monorepo impact |
|---|---|---|
| Package manager | pnpm 11, one `package.json`, `pnpm-workspace.yaml` holds only settings (overrides, allowBuilds, minimumReleaseAge) | add `packages:`; settings stay at root |
| pnpm version | CI `11.10.0`, Amplify `11.25.0`, Docker `pnpm@11` (floating) | unify with `packageManager` field |
| App | Next.js 16.4.5, `output: 'standalone'`, Turbopack, Sentry, React Compiler | needs `outputFileTracingRoot` + `turbopack.root` |
| Docker | `Dockerfile` at root, copies the whole repo, runs `node server.js` | moves to `apps/web/Dockerfile`, uses `turbo prune` |
| CI | 6 workflows; paths like `.next/cache`, `.vitest/blob`, `coverage/` are root-relative | paths move under `apps/web/` |
| Amplify preview | `amplify.yml` at root, `baseDirectory: .next` | must switch to Amplify monorepo format |
| Lint / format | Biome 2.4.15, one `biome.json`, lefthook pre-commit | stays at root, runs per package |
| Tests | Vitest 5, two projects (isolated / shared), `loadEnv(process.cwd())` | config moves with the app; cwd becomes `apps/web` |
| Typecheck | `typescript@7.0.2`; `pnpm typecheck` checks nothing today (known issue) | fix separately, before wiring it into turbo |
| Size | `src/` = 3,680 files | |

Coupling of the two future packages (imports that point back into the app):

| Folder | Files | Imports into app code (`@/features`, `@/config`, `@/entity-configuration`, `@/ui`, …) | Ready to extract? |
|---|---|---|---|
| `src/api/entitycore` | 131 | `@/types/common` 55, `@/utils/dictionary` 28, `@/config` 11, `@/api/api-client` 9, `@/entity-configuration` 3, `@/ui/segments` 1 | close: cut ~15 edges first |
| `src/api` (all) | 187 | `@/features` 2, `@/entity-configuration` 5, `@/ui` 1, `@/config` 22 | close |
| `src/ui/molecules` | 50 | 7 | yes, good first UI package |
| `src/ui/segments` | 780 | 1,275 | **no** – this is feature UI, it stays in the app |
| `src/components` | 291 | 140 | partly (pick the generic ones) |

So: `@obi/ui` should start from `src/ui/molecules` and generic `src/components`, not from all of `src/ui`.

---

## 2. Target layout

```
core-web-app/
├─ apps/
│  └─ web/                      ← everything the Next.js app owns (moved with git mv)
│     ├─ src/  public/  types/  scripts/sync-morphoviewer.sh  tarball/
│     ├─ next.config.ts  tsconfig.json  postcss.config.js  global.d.ts  empty-module.ts
│     ├─ vitest.config.ts  vitest.setup.ts  sentry.*.config.ts  knip.json (or root workspace entry)
│     ├─ .env  .env.development  .env.production  .env.test
│     ├─ Dockerfile
│     └─ package.json           ← name "@obi/web", all app deps + scripts
├─ packages/                    ← empty now; @obi/entitycore, @obi/ui later
├─ scripts/ci/                  ← repo-level CI helpers stay here
├─ .github/  .claude/  courses/  mkdocs.yml  README.md  LICENSE.txt  contributors.csv
├─ biome.json  lefthook.yml  Makefile  docker-compose.yml  .dockerignore  amplify.yml
├─ turbo.json
├─ pnpm-workspace.yaml  pnpm-lock.yaml
└─ package.json                 ← name "core-web-app", private, only turbo/biome/lefthook
```

Names are a default, easy to change: scope `@obi/`, app folder `apps/web`, package `@obi/web`.

---

## 3. Phase 1 – monorepo shell with one app (the scope of this work)

### 3.1 Move files (one commit, moves only)
- `git mv` every app-owned file into `apps/web/`. A move-only commit keeps `git log --follow` and
  `git blame` working and makes review trivial (the diff is renames only).
- Second commit: config changes. Never mix moves and edits in one commit.

### 3.2 Root workspace files

`pnpm-workspace.yaml` – add the package globs, keep every existing setting as is:
```yaml
packages:
  - apps/*
  - packages/*
overrides: …            # unchanged
allowBuilds: …          # unchanged
minimumReleaseAge: 10080 # unchanged – also applies to turbo itself, pin a release older than 7 days
```

Root `package.json` – only repo tools, every script delegates to turbo:
```json
{
  "name": "core-web-app",
  "private": true,
  "packageManager": "pnpm@11.25.0",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "format": "biome format --write"
  },
  "devDependencies": { "turbo": "<pinned 2.x>", "@biomejs/biome": "2.4.15", "lefthook": "^2.1.6" }
}
```

`apps/web/package.json` – today's `dependencies`/`devDependencies` (minus biome/lefthook) and scripts
(`dev`, `build`, `start`, `lint: biome check .`, `typecheck`, `test`, `knip`, `check-imports`, `analyze`).
`dev` keeps the version stamp: `APP_VERSION=$(make -C ../.. version) next dev`.

Lockfile: run `pnpm install` once. Only the importer key should change (`.` → `apps/web`).
**Check:** resolved versions before and after must be identical (diff `pnpm list -r --depth Infinity --json`).

### 3.3 `turbo.json`
```jsonc
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    // Transit node: lets typecheck/test run in parallel across packages, but still
    // re-run when a dependency's source changes (they read deps' source, not their build).
    "transit": { "dependsOn": ["^transit"] },

    "build": {
      "description": "Production build of a package or app",
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env", ".env.production", ".env.production.local"],
      "outputs": [".next/**", "!.next/cache/**", "!.next/dev/**", "dist/**"],
      // full list comes from src/config/schema.ts + next.config.ts (see 3.4)
      "env": ["APP_VERSION", "DEPLOYMENT_ENV", "SENTRY_ORG", "SENTRY_PRJ", "SENTRY_DSN",
              "AWS_APP_ID", "AWS_AMPLIFY_BUILD", "CI", "…"],
      // secrets needed by the build but must not change the cache key
      "passThroughEnv": ["SENTRY_AUTH_TOKEN"]
    },
    "dev":       { "cache": false, "persistent": true },
    "lint":      {},                                   // Biome reads only the package's own files
    "typecheck": { "dependsOn": ["transit"] },
    "test":      { "dependsOn": ["transit"], "outputs": ["coverage/**"] }
  }
}
```
Why this shape:
- Tasks live in each package's `package.json`; the root only calls `turbo run` (Turborepo's main rule:
  root scripts that do the work themselves cannot be parallelised or cached per package).
- `^build` makes the app build wait for its workspace dependencies. Today there are none, so it is a no-op;
  when `@obi/entitycore` is added as `"@obi/entitycore": "workspace:*"`, ordering is automatic.
- `env` matters: Turborepo runs tasks in **strict env mode** by default and removes any variable that is
  not declared. A missing name means the build silently loses it (Sentry upload, preview flags).
- Honest note: the `build` cache will rarely hit, because `APP_VERSION` (git describe) changes every
  commit. The real gains come from `lint`/`typecheck`/`test` on unchanged packages, which only exist once
  packages exist. With one app, Turborepo adds structure, not speed.

### 3.4 Next.js changes (`apps/web/next.config.ts`)
- `outputFileTracingRoot: path.join(import.meta.dirname, '../..')` and `turbopack.root` set to the same
  path. pnpm keeps the real files in the root `node_modules/.pnpm`; without this, standalone output can
  miss files that live above `apps/web`.
- Standalone output changes shape: `.next/standalone/apps/web/server.js` and
  `.next/standalone/node_modules`. Docker and Amplify must follow (3.6, 3.8).
- `turbopack.resolveAlias` uses `./empty-module.ts`. **Check** it still resolves after `turbopack.root`
  moves to the repo root (fallback: absolute path from `import.meta.dirname`).
- Later, each internal package goes into `transpilePackages` (Just-in-Time packages, see Phase 2).
- Runtime file reads use `process.cwd()` (e.g. `src/features/entity-download/utils.ts`, README templates).
  Turbo runs tasks in `apps/web` and Next's standalone `server.js` does `chdir(__dirname)`, so this should
  still work. **Check** with a real download in the Docker image.

### 3.5 Local tooling
| Tool | Change |
|---|---|
| Biome | `biome.json` stays at root; packages run `biome check .` and Biome finds the root config. |
| lefthook | unchanged (root `pnpm exec biome` on staged files). |
| TypeScript | `apps/web/tsconfig.json` keeps `@/* → ./src/*`. A shared `packages/tsconfig` waits for the 2nd package. |
| Vitest | config moves with the app; `.env*` move too, so `loadEnv(process.cwd())` keeps working. |
| knip | root `knip.json` with `workspaces: { "apps/web": { … } }`. |
| check-barrel-import-violation | path becomes `apps/web/tsconfig.json`. |
| `sync-morphoviewer.sh` | moves to `apps/web/scripts/`; the sibling path `../morphoviewer` becomes `../../../morphoviewer` (or set `MORPHOVIEWER_LIB`). |
| `.claude/launch.json` | `pnpm --filter @obi/web dev` (or `pnpm dev`). |
| AI agents | optional `"agentGuidance": true` in `turbo.json` → turbo keeps a block in `AGENTS.md` pointing to version-matched docs. |

### 3.6 Docker (`apps/web/Dockerfile`, build context = repo root)
Pattern from the Turborepo Docker guide: **prune → install → build → run**.
```dockerfile
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat && corepack enable
WORKDIR /app

# 1. prune: keep only @obi/web and the workspace packages it depends on
FROM base AS prune
COPY . .
RUN pnpm dlx turbo@<same pinned version> prune @obi/web --docker

# 2. install: only package.json files + pruned lockfile → this layer is cached
#    until dependencies change, not on every source edit
FROM base AS deps
COPY --from=prune /app/out/json/ .
RUN pnpm install --frozen-lockfile

# 3. build
FROM deps AS builder
COPY --from=prune /app/out/full/ .
ARG APP_VERSION
RUN --mount=type=cache,id=next,target=/app/apps/web/.next/cache \
    pnpm turbo run build --filter=@obi/web

# 4. run: standalone output only, non-root user (same as today)
FROM node:24-alpine AS runner
ENV NODE_ENV=production PORT=8000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
WORKDIR /app
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 8000
CMD ["node", "apps/web/server.js"]
```
- The same file builds any future app: change only the prune target. A new app gets its own Dockerfile.
- `.dockerignore` at root: add `**/node_modules`, `**/.next`, `**/.turbo`, `out`.
- `docker-compose.yml`: `build: { context: ., dockerfile: apps/web/Dockerfile }`, watch paths
  `apps/web/src`, `packages/`, env files under `apps/web/`.
- `Makefile` stays at root; targets unchanged (`make build`, `make publish`, `make version`).
- **Risk – verify first:** `turbo prune` must read the pnpm 11 lockfile and keep the
  `pnpm-workspace.yaml` settings (`overrides`, `allowBuilds`, `minimumReleaseAge`). If it does not,
  fallback: skip prune and `pnpm install --frozen-lockfile --filter @obi/web...` on the full lockfile
  (bigger install layer, same image).
- Compare against today: image size and build time (must not grow).

### 3.7 CI (GitHub Actions)
- All jobs: drop the hard-coded `version: 11.10.0` from `pnpm/action-setup` so it reads `packageManager`.
- `run-checks.yml`: `pnpm turbo run lint typecheck build --affected` (needs `fetch-depth: 0` or the
  base ref fetched for `--affected`). Cache path `.next/cache` → `apps/web/.next/cache`; add `.turbo`
  to `actions/cache` for the local turbo cache.
- `test.yml`: keep the 4 shards. `pnpm --filter @obi/web exec vitest run --shard=…`; artifact paths
  `.vitest/blob` → `apps/web/.vitest/blob`, `coverage/` → `apps/web/coverage/`.
  `scripts/ci/render-test-coverage-report.mjs` stays at root, input path updated.
- `release-aws.yml`: unchanged (`make publish`), the Makefile points to the new Dockerfile.
- `e2e-relay.yml`, `run-audit.yml`: unchanged apart from pnpm version.

### 3.8 Amplify preview (highest risk, needs AWS console access)
- Convert `amplify.yml` to the monorepo format: `applications: [{ appRoot: apps/web, frontend: … }]`.
- Set `AMPLIFY_MONOREPO_APP_ROOT=apps/web` in the Amplify app settings (console, not in the repo).
- Install from the repo root (`cd ../.. && pnpm install --frozen-lockfile`), build with
  `pnpm turbo run build --filter=@obi/web`.
- Artifacts: `baseDirectory: .next` is now relative to `apps/web`; standalone has the new nested shape.
- AWS documents that Next.js SSR with pnpm may need `node-linker=hoisted` in `.npmrc`. Try without it
  first; add it only if the preview fails to start.
- Do this on a throw-away preview branch before merging.

### 3.9 Done when (all must pass, each measured against the `main` baseline)
1. `pnpm install --frozen-lockfile` passes; resolved versions identical to before.
2. `pnpm dev` serves the app on :3000; HMR works.
3. `pnpm build` passes; `pnpm turbo run build` twice → second run is a cache hit (`>>> FULL TURBO`)
   when `APP_VERSION` is fixed.
4. `pnpm test`: same number of tests, same pass count.
5. `pnpm lint` and lefthook pre-commit work.
6. Docker image builds, starts, serves `/app/version`, a file download works; size and build time
   compared to today.
7. CI green on the PR; Amplify preview deploys and logs in.
8. A dummy `packages/example` with `workspace:*` makes `turbo run build --filter=@obi/web...` build it
   first, and `turbo prune @obi/web` includes it (then delete it). This proves the package path works
   before any real package exists.

### 3.10 Open pull requests (30 open on 2026-11-11) – measured, not guessed
Trial run: the move commit was built locally (3,863 pure renames) and every open PR was merged into it.

What a plain `git merge main` does after the move:
- **No new content conflicts.** Every PR has the same number or fewer hand-edit conflicts than it has
  against `main` today.
- New conflicts are mechanical only: the PR deleted or renamed a file that the move also renamed.
- Two **silent** traps (merge reports success, result is wrong):
  1. a file the PR **added** can stay in the old `src/` (seen in 9 of the 15 PRs that merge cleanly today), so the app and
     tests no longer see it;
  2. `main` has 24 groups of identical files at different paths; when a PR deletes one copy, git can
     swap the paths (seen once, PR #2070).

So branches do **not** use plain merge. They use `scripts/monorepo/move.sh port`. It re-applies the
branch's own changes with paths prefixed by `apps/web/`, so git never has to guess a rename.
Tested on the 15 PRs that merge cleanly with `main` today: 0 conflicts, 0 wrong files, same PR diff
size, normal merge commit (no force push). Changes to root `package.json` land in `apps/web/package.json`.

Rollout:
1. **Before:** announce a date. Merge what is approved. Close or park stale PRs (6 are 2–4 months old and
   118–203 commits behind: #1822, #1835, #1851, #1856, #1903, #1927).
2. **Freeze moment:** tag the last pre-move commit `pre-monorepo`, merge the monorepo PR right after.
   Its move-only commit is made with `scripts/monorepo/move.sh move`, so the move and the port use one
   path list.
3. **Each open branch** (author, or a maintainer with the author's OK):
   - conflicts with main today (15 PRs): merge `pre-monorepo` and resolve as usual first. This work
     exists anyway; the move adds none.
   - then: `bash scripts/monorepo/move.sh port` → push. If it says dependencies changed:
     `pnpm install`, commit `pnpm-lock.yaml`.
4. **Guard in CI** (`run-checks.yml`): fail if `src/` or `public/` exists at the repo root. This catches a
   branch that used a plain merge (trap 1).
5. The script stays in the repo for a few weeks, then is deleted.

---

## 4. Phase 2 – `@obi/entitycore` (later)
Prepare inside the app first, so the move itself is mechanical:
1. Remove the back-edges: `@/entity-configuration` (3), `@/ui/segments` (1), `@/features` (2).
2. Replace direct `@/config` reads (11) with a client factory: the app passes base URL and the auth
   `fetch` in (dependency injection), so the package has no app config or env knowledge.
3. Move the types it needs (`@/types/common`, `@/utils/dictionary`, …) into the package or a small
   `@obi/types` package if `@obi/ui` needs them too.
4. Packages do **not** use the app's `@/` alias. Use relative imports or the package's own
   `"imports": { "#*": "./src/*" }`.
5. Package type: **Just-in-Time** (exports `.ts` source, no build step; the app compiles it via
   `transpilePackages`). Switch to a compiled package (tsdown → `dist/`) only if another consumer
   (Node service, other app) needs it.
6. Add `typecheck`/`test`/`lint` scripts in the package; turbo picks them up with no `turbo.json` change.

## 5. Phase 3 – `@obi/ui` (later)
- Start from `src/ui/molecules` (50 files, 7 app imports) plus generic pieces of `src/components`.
- `src/ui/segments` (780 files, 1,275 app imports) stays in the app: it is feature UI, not a kit.
- Tailwind 4: the app's CSS must `@source` the package folder so its classes are generated.

## 6. Phase 4 – when there are 2+ packages or apps
- Remote cache (Vercel, or self-hosted on S3 since the stack is on AWS) shared by CI, Docker and devs.
- `turbo boundaries` + tags so packages cannot import apps.
- Shared `packages/tsconfig` once two packages repeat the same compiler options.

---

## 7. Open decisions for the team
1. Names: `@obi/` scope and `apps/web` folder – OK?
2. Amplify: who changes the console setting (`AMPLIFY_MONOREPO_APP_ROOT`)?
3. Remote cache: Vercel or self-hosted on AWS (Phase 4, no need now).
4. Fix the broken `typecheck` (TypeScript 7 issue) before or after the migration?

## 8. References
- Turborepo docs: https://turborepo.dev/docs (Docker guide, `turbo prune`, transit nodes, strict env mode)
- Turborepo for AI agents: https://turborepo.dev/docs/guides/ai (`agentGuidance`, `turbo docs`)
- Dub (Next.js + pnpm + Turborepo): https://github.com/dubinc/dub – `^build`, `.next/**` outputs,
  uncached `dev`; deployed on Vercel, so no Docker pattern to copy from it.
