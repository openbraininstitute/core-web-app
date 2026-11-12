# Admin

Operator-only area of the platform. Routes are in `src/app/app/admin/`, everything else here.

## Authorization

Neither raw Keycloak groups nor a coarse boolean reach the browser. Groups are resolved
server-side from `/userinfo` (`server/keycloak-groups.ts`, cached per user) and reduced to a closed,
typed `OperatorCapabilities` record (`capabilities/`). The record reaches the client only as a
prop of the admin shell, where it filters the sidebar. Admin has no link in the platform: operators
open `/app/admin` directly.

The protected layout and every page re-check on the server with `requireCapability`
(`server/require-capability.ts`). Layouts don't re-run on client-side navigation, so a new page
must call it too; `src/__tests__/admin/pages-guard.test.ts` fails if one doesn't. When the groups
can't be read, the layout throws and `src/app/app/admin/error.tsx` shows the outage page.

Groups are read from `/userinfo`, which the `groups` scope the app requests fills. Don't add a
Keycloak mapper that puts them in the access or ID token: the list can be large, and the access
token lives in the session cookie.

## Query keys

`query-keys.ts` uses tuples (`['admin', 'services', …]`) rather than the `keyBuilder` strings in
`src/ui/use-query-keys`, because Refresh invalidates a whole section by prefix.

## Keeping the registry honest

`capabilities/registry.ts` mirrors the group gates in the backend services. When a gate changes
upstream, update the constant and its `derive.test.ts` case first. The wildcard group is not
uniform: entitycore and Bluenaas honor it, virtual-lab-api and launch-system don't.

Group changes can take about 10 minutes to show, because our cache and each service's cache hold
groups for about 5 minutes.
