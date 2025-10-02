import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  isServer: typeof window === 'undefined',
  // Validating environment variables only in runtime.
  // TODO Add validation of client env vars during the build,
  // requires: https://github.com/t3-oss/t3-env/issues/85.
  skipValidation: ['lint', 'test', 'test:ci', 'build', 'lint:fix', 'lint:only'].includes(
    String(process.env.npm_lifecycle_event)
  ),
  emptyStringAsUndefined: true,

  server: {
    KEYCLOAK_ISSUER: z.string().url(),
    KEYCLOAK_CLIENT_ID: z.string().min(3),
    KEYCLOAK_CLIENT_SECRET: z.string().min(5),

    NEXTAUTH_SECRET: z.string().min(5),

    MAILCHIMP_API_KEY: z.string().min(1),
    MAILCHIMP_AUDIENCE_ID: z.string().min(1),
    MAILCHIMP_API_SERVER: z.string().min(1),
    GITHUB_TOKEN: z.string().optional(),

    CI_COMMIT_SHORT_SHA: z.string().optional(),
    npm_package_version: z.string().optional(),
  },

  client: {
    NEXT_PUBLIC_BASE_PATH: z.preprocess((basePath) => basePath ?? '', z.string()),
    NEXT_PUBLIC_CDN_URI: z.string().url().optional(),
    // When run on non-protected branch in Gitlab CI the value of env var will be an empty string.
    // This transforms an empty string value to undefined in order to pass the .optional validation.
    NEXT_PUBLIC_SENTRY_DSN: z.preprocess(
      (sentryDsn) => sentryDsn || undefined,
      z.string().url().optional()
    ),
    NEXT_PUBLIC_SENTRY_ORG: z.string().optional(),
    NEXT_PUBLIC_SENTRY_PRJ: z.string().optional(),

    NEXT_PUBLIC_ACCOUNTING_BASE_URL: z.string().url().optional(),

    NEXT_PUBLIC_SMALL_SCALE_SIMULATOR_URL: z.string().url(),
    NEXT_PUBLIC_CELL_SVC_BASE_URL: z.string().url(),
    NEXT_PUBLIC_THUMBNAIL_GENERATION_BASE_URL: z.string().url(),

    NEXT_PUBLIC_VIRTUAL_LAB_API_URL: z.string().url(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
    NEXT_PUBLIC_DEPLOYMENT_ENV: z.enum(['preview', 'development', 'staging', 'production']),
    NEXT_PUBLIC_MATOMO_URL: z.string().optional(),
    NEXT_PUBLIC_MATOMO_CDN_URL: z.string().optional(),
    NEXT_PUBLIC_MATOMO_SITE_ID: z.string().optional(),
    // There is only one Sanity server, but with two datasets.
    NEXT_PUBLIC_SANITY_DATASET: z.enum(['staging', 'production']).optional(),
    NEXT_PUBLIC_ENTITY_CORE_URL: z.string().url(),
    NEXT_PUBLIC_ENTITY_CORE_PUBLIC_VIRTUAL_LAB_ID: z.string().nonempty(),
    NEXT_PUBLIC_ENTITY_CORE_PUBLIC_PROJECT_ID: z.string().nonempty(),
    NEXT_PUBLIC_DEFAULT_BRAIN_REGION_HIERARCHY_ID: z.string().nonempty(),
    NEXT_PUBLIC_DEFAULT_SELECTED_BRAIN_REGION_ID: z.string().nonempty(),
    NEXT_PUBLIC_BASIC_CELL_GROUPS_AND_REGIONS_BRAIN_REGION_ANNOTATION_VALUE: z.string().nonempty(),
    NEXT_PUBLIC_DEFAULT_BRAIN_ATLAS_ID: z.string().nonempty(),
    NEXT_PUBLIC_ROOT_BRAIN_REGION_ANNOTATION_VALUE: z.string().nonempty(),
    NEXT_PUBLIC_ROOT_BRAIN_REGION_ID: z.string().nonempty(),
    NEXT_PUBLIC_LEGACY_DEFAULT_CIRCUIT_ID: z.string().url().optional(),
    NEXT_PUBLIC_CORE_WEB_APP_VERSION: z.string().optional(),
    NEXT_PUBLIC_NOTEBOOK_SERVICE_BASE_URL: z.string().optional(),
    NEXT_PUBLIC_OBI_ONE_URL: z.string().optional(),
  },

  experimental__runtimeEnv: {
    NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH,

    NEXT_PUBLIC_ACCOUNTING_BASE_URL: process.env.NEXT_PUBLIC_ACCOUNTING_BASE_URL,

    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_SENTRY_ORG: process.env.NEXT_PUBLIC_SENTRY_ORG,
    NEXT_PUBLIC_SENTRY_PRJ: process.env.NEXT_PUBLIC_SENTRY_PRJ,

    NEXT_PUBLIC_SMALL_SCALE_SIMULATOR_URL: process.env.NEXT_PUBLIC_SMALL_SCALE_SIMULATOR_URL,
    NEXT_PUBLIC_CELL_SVC_BASE_URL: process.env.NEXT_PUBLIC_CELL_SVC_BASE_URL,
    NEXT_PUBLIC_THUMBNAIL_GENERATION_BASE_URL:
      process.env.NEXT_PUBLIC_THUMBNAIL_GENERATION_BASE_URL,

    NEXT_PUBLIC_VIRTUAL_LAB_API_URL: process.env.NEXT_PUBLIC_VIRTUAL_LAB_API_URL,

    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_DEPLOYMENT_ENV: process.env.NEXT_PUBLIC_DEPLOYMENT_ENV,
    NEXT_PUBLIC_MATOMO_URL: process.env.NEXT_PUBLIC_MATOMO_URL,
    NEXT_PUBLIC_MATOMO_CDN_URL: process.env.NEXT_PUBLIC_MATOMO_CDN_URL,
    NEXT_PUBLIC_MATOMO_SITE_ID: process.env.NEXT_PUBLIC_MATOMO_SITE_ID,
    NEXT_PUBLIC_ENTITY_CORE_URL: process.env.NEXT_PUBLIC_ENTITY_CORE_URL,
    NEXT_PUBLIC_ENTITY_CORE_PUBLIC_VIRTUAL_LAB_ID:
      process.env.NEXT_PUBLIC_ENTITY_CORE_PUBLIC_VIRTUAL_LAB_ID,
    NEXT_PUBLIC_ENTITY_CORE_PUBLIC_PROJECT_ID:
      process.env.NEXT_PUBLIC_ENTITY_CORE_PUBLIC_PROJECT_ID,
    NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET,
    NEXT_PUBLIC_DEFAULT_BRAIN_REGION_HIERARCHY_ID:
      process.env.NEXT_PUBLIC_DEFAULT_BRAIN_REGION_HIERARCHY_ID,
    NEXT_PUBLIC_DEFAULT_SELECTED_BRAIN_REGION_ID:
      process.env.NEXT_PUBLIC_DEFAULT_SELECTED_BRAIN_REGION_ID,
    NEXT_PUBLIC_BASIC_CELL_GROUPS_AND_REGIONS_BRAIN_REGION_ANNOTATION_VALUE:
      process.env.NEXT_PUBLIC_BASIC_CELL_GROUPS_AND_REGIONS_BRAIN_REGION_ANNOTATION_VALUE,
    NEXT_PUBLIC_DEFAULT_BRAIN_ATLAS_ID: process.env.NEXT_PUBLIC_DEFAULT_BRAIN_ATLAS_ID,
    NEXT_PUBLIC_ROOT_BRAIN_REGION_ANNOTATION_VALUE:
      process.env.NEXT_PUBLIC_ROOT_BRAIN_REGION_ANNOTATION_VALUE,
    NEXT_PUBLIC_ROOT_BRAIN_REGION_ID: process.env.NEXT_PUBLIC_ROOT_BRAIN_REGION_ID,
    NEXT_PUBLIC_LEGACY_DEFAULT_CIRCUIT_ID: process.env.NEXT_PUBLIC_LEGACY_DEFAULT_CIRCUIT_ID,
    NEXT_PUBLIC_CDN_URI: process.env.NEXT_PUBLIC_CDN_URI,
    NEXT_PUBLIC_CORE_WEB_APP_VERSION: process.env.NEXT_PUBLIC_CORE_WEB_APP_VERSION,

    NEXT_PUBLIC_NOTEBOOK_SERVICE_BASE_URL: process.env.NEXT_PUBLIC_NOTEBOOK_SERVICE_BASE_URL,
    NEXT_PUBLIC_OBI_ONE_URL: process.env.NEXT_PUBLIC_OBI_ONE_URL,
  },
});
