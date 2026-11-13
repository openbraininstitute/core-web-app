// Group names are contracts with the backend services, not deployment settings, so there
// is no env override.

// A real Keycloak group, matched by exact membership. Honored by entitycore
// (app/schemas/auth.py) and Bluenaas (app/infrastructure/kc/auth.py). Not honored by
// virtual-lab-api, whose ServiceGate parses it as a service named "*", or by launch-system.
export const WILDCARD_ADMIN_GROUP = '/service/*/admin';

// entitycore app/schemas/auth.py, UserContext.is_service_admin
export const ENTITYCORE_ADMIN_GROUP = '/service/entitycore/admin';

// virtual-lab-api virtual_labs/routes/admin/deps.py: platform_admin, platform_read
export const VLAB_ADMIN_GROUP = '/service/virtual-lab-svc/admin';
export const VLAB_MAINTAINER_GROUP = '/service/virtual-lab-svc/maintainer';

// accounting-service has no auth of its own, so this mirrors nothing: the web app's proxy
// is the trust boundary.
export const ACCOUNTING_ADMIN_GROUP = '/service/accounting/admin';

// Bluenaas app/infrastructure/kc/auth.py, verify_admin
export const SIMULATOR_ADMIN_GROUP = '/service/small-scale-simulator/admin';

// launch-system services/api/app/routers/job.py and schemas/auth.py: exact match
export const LAUNCH_SYSTEM_ADMIN_GROUP = '/service/launch-system/admin';

// `admin.access` has no groups of its own: `derive.ts` grants it when anything else is held.
export const CAPABILITY_REGISTRY = {
  entitycore: {
    admin: [ENTITYCORE_ADMIN_GROUP, WILDCARD_ADMIN_GROUP],
    // Uploads go through virtual-lab-api with the operator's token, which needs the literal
    // group: a wildcard-only operator gets a 500.
    assetWrite: [ENTITYCORE_ADMIN_GROUP],
  },
  virtualLab: {
    read: [VLAB_ADMIN_GROUP, VLAB_MAINTAINER_GROUP],
    admin: [VLAB_ADMIN_GROUP],
  },
  // virtual_labs/routes/promotions.py: exact admin membership, so no maintainers.
  promotions: {
    admin: [VLAB_ADMIN_GROUP],
  },
  accounting: {
    admin: [ACCOUNTING_ADMIN_GROUP, WILDCARD_ADMIN_GROUP],
  },
  simulator: {
    admin: [SIMULATOR_ADMIN_GROUP, WILDCARD_ADMIN_GROUP],
  },
  launchSystem: {
    admin: [LAUNCH_SYSTEM_ADMIN_GROUP],
  },
} as const satisfies Record<string, Record<string, readonly string[]>>;
