# Admin

Operator-only area of the platform. Routes are in `src/app/app/admin/`, everything else here.

## Authorization

Neither raw Keycloak groups nor a coarse boolean reach the browser. Groups are resolved
server-side from `/userinfo` (`server/groups.ts`, cached per user) and reduced to a closed,
typed `OperatorCapabilities` record (`capabilities/`). The record reaches the client only as a
prop of the admin shell, where it filters the sidebar. Admin has no link in the platform: operators
open `/app/admin` directly.

The protected layout and every page re-check on the server with `requireCapability`. Layouts
don't re-run on client-side navigation, so a new page must call it too.

There is deliberately no Keycloak token mapper for groups. The list can be large, and it would
grow the session cookie.

## Keeping the registry honest

`capabilities/registry.ts` mirrors the group gates in the backend services. When a gate changes
upstream, update the constant and its `derive.test.ts` case first. The wildcard group is not
uniform: entitycore and Bluenaas honor it, virtual-lab-api and launch-system don't.

Group changes can take about 10 minutes to show, because our cache and each service's cache hold
groups for about 5 minutes.
