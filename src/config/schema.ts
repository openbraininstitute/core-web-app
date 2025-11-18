import { z } from 'zod';

export const serverSchema = z.object({
  APP_VERSION: z.string().optional(),

  DEPLOYMENT_ENV: z.enum(['local', 'preview', 'development', 'staging', 'production']),

  KEYCLOAK_CLIENT_ID: z.string().min(3),
  KEYCLOAK_CLIENT_SECRET: z.string().min(5),
  KEYCLOAK_ISSUER: z.string().url(),

  NEXTAUTH_SECRET: z.string().min(5),

  MAILCHIMP_API_KEY: z.string().min(1),
  MAILCHIMP_API_SERVER: z.string().min(1),
  MAILCHIMP_AUDIENCE_ID: z.string().min(1),

  GITHUB_TOKEN: z.string().optional(),

  AI_AGENT_URL: z.string().url().optional(),
  AUTH_MANAGER_URL: z.string().url().optional(),
  CELL_API_URL: z.string().url(),
  ENTITY_CORE_URL: z.string().url(),
  NOTEBOOK_API_URL: z.string().optional(),
  OBI_ONE_URL: z.string().nonempty(),
  SMALL_SCALE_SIMULATOR_URL: z.string().url(),
  THUMBNAIL_API_URL: z.string().url(),
  VIRTUAL_LAB_API_URL: z.string().url(),

  ROOT_ROUTE: z.string(),

  CDN_URI: z.string().url().optional(),

  SENTRY_DSN: z.preprocess((sentryDsn) => sentryDsn || undefined, z.string().url().optional()),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PRJ: z.string().optional(),

  STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),

  MATOMO_CDN_URL: z.string().optional(),
  MATOMO_SITE_ID: z.string().optional(),
  MATOMO_URL: z.string().optional(),

  SANITY_DATASET: z.enum(['staging', 'production']),

  ENTITY_CORE_PUBLIC_PROJECT_ID: z.string().nonempty(),
  ENTITY_CORE_PUBLIC_VIRTUAL_LAB_ID: z.string().nonempty(),

  BASIC_CELL_GROUPS_AND_REGIONS_BRAIN_REGION_ANNOTATION_VALUE: z.string().nonempty(),
  DEFAULT_BRAIN_ATLAS_ID: z.string().nonempty(),
  DEFAULT_BRAIN_REGION_HIERARCHY_ID: z.string().nonempty(),
  DEFAULT_SELECTED_BRAIN_REGION_ID: z.string().nonempty(),
  LEGACY_DEFAULT_CIRCUIT_ID: z.string().url().optional(),
  ROOT_BRAIN_REGION_ANNOTATION_VALUE: z.string().nonempty(),
  ROOT_BRAIN_REGION_ID: z.string().nonempty(),

  NOTEBOOK_REPO_URL: z.string().url(),
});

// ! WARNING: clientSchema configurations are exposed in the browser.
// ! Only add configurations that are safe to be public. NO SECRETS.
export const clientSchema = serverSchema.pick({
  AI_AGENT_URL: true,
  APP_VERSION: true,
  AUTH_MANAGER_URL: true,
  BASIC_CELL_GROUPS_AND_REGIONS_BRAIN_REGION_ANNOTATION_VALUE: true,
  CDN_URI: true,
  CELL_API_URL: true,
  DEFAULT_BRAIN_ATLAS_ID: true,
  DEFAULT_BRAIN_REGION_HIERARCHY_ID: true,
  DEFAULT_SELECTED_BRAIN_REGION_ID: true,
  DEPLOYMENT_ENV: true,
  ENTITY_CORE_PUBLIC_PROJECT_ID: true,
  ENTITY_CORE_PUBLIC_VIRTUAL_LAB_ID: true,
  ENTITY_CORE_URL: true,
  LEGACY_DEFAULT_CIRCUIT_ID: true,
  MATOMO_CDN_URL: true,
  MATOMO_SITE_ID: true,
  MATOMO_URL: true,
  NOTEBOOK_REPO_URL: true,
  NOTEBOOK_API_URL: true,
  OBI_ONE_URL: true,
  ROOT_BRAIN_REGION_ANNOTATION_VALUE: true,
  ROOT_BRAIN_REGION_ID: true,
  ROOT_ROUTE: true,
  SANITY_DATASET: true,
  SENTRY_DSN: true,
  SENTRY_ORG: true,
  SENTRY_PRJ: true,
  SMALL_SCALE_SIMULATOR_URL: true,
  STRIPE_PUBLISHABLE_KEY: true,
  THUMBNAIL_API_URL: true,
  VIRTUAL_LAB_API_URL: true,
});

export type ServerConfig = z.infer<typeof serverSchema>;
export type ClientConfig = z.infer<typeof clientSchema>;
