# instant-nav rig: core-web-app

- BUILD: local production artifact with `APP_VERSION=test EXPOSE_TESTING_API=1 pnpm build`; Playwright starts it with `pnpm start` on port 3000 when `E2E_INSTANT=1`.
- EXPOSE: `EXPOSE_TESTING_API=1` during `next build`; `next.config.ts` keeps the testing API disabled otherwise.
- RUN: fresh artifact: `E2E_INSTANT=1 pnpm exec playwright test --project=instant-private src/__tests__/e2e/tests/private/browse-to-detail.instant.spec.ts`; reuse the current verified artifact with `E2E_INSTANT=1 E2E_SKIP_BUILD=1 ...`. Base URL is `NEXTAUTH_URL` or `http://localhost:3000`.
- TEST USER: existing Keycloak E2E account from `.env.test.secrets`, authenticated by `auth-setup`; state: isolated project plus public entity data, default feature flags and locale.
- DRIFT: public cell-morphology availability depends on staging data; the guard fails rather than skips if no real row is available.
- CONTRACTS: soft navigation from `/data/browse/entity/cell-morphology?s=all` through the real mini-detail `View details` link to `/data/view/cell-morphology/:id/overview?s=all`; `data-view-loading` is the immediate App Shell marker and `data-view-breadcrumb` is deferred real detail chrome.
- LOOP: stop any process on port 3000, run the focused command above (build → start → authenticated test → stop), edit, repeat; agent limits: valid local E2E credentials and network access to Keycloak/staging APIs are required.
- LIVENESS: n/a; every run builds and starts the current local worktree.
- WALLS: Cache Components initially exposed a build-time config bypass that returned an empty client config; validate the real checked-in env schema during builds instead. Full `pnpm typecheck` is separately blocked by the repository's TypeScript 7 `baseUrl` configuration.
