import { z } from 'zod';

const DEFAULT_API_BASE_PATH = '/api';

// ! WARNING: public configuration properties are exposed in the browser.
// ! Only enable this for entries which are safe to be public. NO SECRETS.
const configFields = {
  // TODO validate non-optional entries for staging/production, e.g. matomo, sentry, mailchimp.
  APP_VERSION: { schema: z.string().nonempty(), public: true },

  DEPLOYMENT_ENV: {
    schema: z.enum(['local', 'preview', 'development', 'staging', 'production']),
    public: true,
  },

  KEYCLOAK_CLIENT_ID: { schema: z.string().nonempty(), public: false },
  KEYCLOAK_CLIENT_SECRET: { schema: z.string().nonempty(), public: false },
  KEYCLOAK_ISSUER: { schema: z.string().url(), public: false },

  NEXTAUTH_SECRET: { schema: z.string().nonempty(), public: false },
  AUTH_PROXY_URL: { schema: z.string().url().optional(), public: true },

  MAILCHIMP_API_KEY: {
    schema: z.string().nonempty().optional(),
    public: false,
  },
  MAILCHIMP_API_SERVER: {
    schema: z.string().nonempty().optional(),
    public: false,
  },
  MAILCHIMP_AUDIENCE_ID: {
    schema: z.string().nonempty().optional(),
    public: false,
  },

  GITHUB_TOKEN: { schema: z.string().optional(), public: false },

  GITHUB_FEEDBACK_TOKEN: { schema: z.string().optional(), public: false },
  GITHUB_FEEDBACK_PROJECT_ID: { schema: z.string().optional(), public: false },

  API_ORIGIN: { schema: z.string().url().optional(), public: true },

  AI_AGENT_URL: { schema: z.string().url().optional(), public: true },
  AUTH_MANAGER_URL: { schema: z.string().url().optional(), public: true },
  CELL_API_URL: { schema: z.string().url().optional(), public: true },
  ENTITY_CORE_URL: { schema: z.string().url().optional(), public: true },
  NOTEBOOK_API_URL: { schema: z.string().optional(), public: true },
  OBI_ONE_URL: { schema: z.string().url().optional(), public: true },
  SMALL_SCALE_SIMULATOR_URL: {
    schema: z.string().url().optional(),
    public: true,
  },
  THUMBNAIL_API_URL: { schema: z.string().url().optional(), public: true },
  VIRTUAL_LAB_API_URL: { schema: z.string().url().optional(), public: true },

  ROOT_ROUTE: { schema: z.string(), public: true },

  CDN_URL: { schema: z.string().url().optional(), public: true },

  SENTRY_DSN: {
    schema: z.preprocess((sentryDsn) => sentryDsn || undefined, z.string().url().optional()),
    public: true,
  },
  SENTRY_ORG: { schema: z.string().optional(), public: true },
  SENTRY_PRJ: { schema: z.string().optional(), public: true },

  STRIPE_PUBLISHABLE_KEY: {
    schema: z.string().startsWith('pk_'),
    public: true,
  },

  MATOMO_CDN_URL: { schema: z.string().nonempty().optional(), public: true },
  MATOMO_SITE_ID: { schema: z.string().nonempty().optional(), public: true },
  MATOMO_URL: { schema: z.string().nonempty().optional(), public: true },

  SANITY_PROJECT_ID: { schema: z.string().nonempty(), public: true },
  SANITY_DATASET: { schema: z.enum(['staging', 'production']), public: true },

  ENTITY_CORE_PUBLIC_PROJECT_ID: {
    schema: z.string().nonempty(),
    public: true,
  },
  ENTITY_CORE_PUBLIC_VIRTUAL_LAB_ID: {
    schema: z.string().nonempty(),
    public: true,
  },
  APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID: {
    schema: z.string().nonempty(),
    public: true,
  },
  APP_DEFAULT__BRAIN_ATLAS__ID: {
    schema: z.string().nonempty(),
    public: true,
  },
  // MOUSE
  MOUSE_BRAIN_REGION_HIERARCHY_ID: {
    schema: z.string().nonempty(),
    public: true,
  },
  MOUSE_ROOT__BRAIN_REGION_ID: {
    schema: z.string().nonempty(),
    public: true,
  },
  MOUSE_ROOT__BRAIN_REGION_ANNOTATION_VALUE: {
    schema: z.string().nonempty().default('997'),
    public: true,
  },
  /**
   * Represents the primary anatomical division annotation value for a given voxel
   * or region in the Allen Mouse Brain Common Coordinate Framework (CCF).
   * This value encodes the highest-level anatomical partition (e.g., major
   * brain compartments) assigned to the voxel according to the Allen structural
   * ontology hierarchy, facilitating region-specific analysis and lookup.
   */
  MOUSE_PRIMARY__DIVISION_ANNOTATION_VALUE: {
    schema: z.string().nonempty().default('8'),
    public: true,
  },
  MOUSE_DEFAULT__SELECTED_BRAIN_REGION_ID: {
    schema: z.string().nonempty(),
    public: true,
  },
  MOUSE_ATLAS__ID: { schema: z.string().nonempty(), public: true },
  // HUMAN
  HUMAN_BRAIN_REGION_HIERARCHY_ID: {
    schema: z.string().nonempty(),
    public: true,
  },
  HUMAN_ROOT__BRAIN_REGION_ID: {
    schema: z.string().nonempty(),
    public: true,
  },
  HUMAN_ROOT__BRAIN_REGION_ANNOTATION_VALUE: {
    schema: z.string().nonempty().default('999'),
    public: true,
  },
  /**
   * Annotation value representing the primary anatomical division for a given
   * voxel or region in the Allen Human Brain Reference Atlas. This value
   * encodes the top-level anatomical partition (major structural compartments
   * of the human brain) according to the atlas’s hierarchical ontology.
   * It is intended for use in region lookup, grouping, and spatial analysis.
   */
  HUMAN_PRIMARY__DIVISION_ANNOTATION_VALUE: {
    schema: z.string().nonempty('999'),
    public: true,
  },

  HUMAN_DEFAULT__SELECTED_BRAIN_REGION_ID: {
    schema: z.string().nonempty(),
    public: true,
  },
  HUMAN_ATLAS__ID: { schema: z.string().nonempty(), public: true },
  // RAT
  RAT_BRAIN_REGION_HIERARCHY_ID: {
    schema: z.string().nonempty(),
    public: true,
  },
  RAT_ROOT__BRAIN_REGION_ID: {
    schema: z.string().nonempty(),
    public: true,
  },
  RAT_ROOT__BRAIN_REGION_ANNOTATION_VALUE: {
    schema: z.string().nonempty().default('997'),
    public: true,
  },
  RAT_PRIMARY__DIVISION_ANNOTATION_VALUE: {
    schema: z.string().nonempty().default('8'),
    public: true,
  },
  RAT_DEFAULT__SELECTED_BRAIN_REGION_ID: {
    schema: z.string().nonempty(),
    public: true,
  },
  RAT_ATLAS__ID: { schema: z.string().nonempty(), public: true },
  LEGACY_DEFAULT_CIRCUIT_ID: {
    schema: z.string().url().nonempty(),
    public: true,
  },

  NOTEBOOK_REPO_URL: { schema: z.string().url(), public: true },
} as const;

const platformApiUrlFields = {
  AI_AGENT_URL: '/agent',
  AUTH_MANAGER_URL: '/auth-manager/v1',
  CELL_API_URL: '/circuit',
  ENTITY_CORE_URL: '/entitycore',
  NOTEBOOK_API_URL: '/notebook_service',
  OBI_ONE_URL: '/obi-one',
  SMALL_SCALE_SIMULATOR_URL: '/small-scale-simulator',
  THUMBNAIL_API_URL: '/thumbnail-generation',
  VIRTUAL_LAB_API_URL: '/virtual-lab-manager',
} as const satisfies Partial<Record<keyof typeof configFields, string>>;

const baseServerSchema = z
  .object(
    Object.fromEntries(Object.entries(configFields).map(([key, { schema }]) => [key, schema]))
  )
  .superRefine((data, ctx) => {
    if (data.AUTH_PROXY_URL && data.DEPLOYMENT_ENV !== 'preview') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'AUTH_PROXY_URL can only be set when DEPLOYMENT_ENV is "preview"',
        path: ['AUTH_PROXY_URL'],
      });
    }
  }) as any as z.ZodObject<{
  [K in keyof typeof configFields]: (typeof configFields)[K]['schema'];
}>;

// biome-ignore lint/suspicious/noExplicitAny: reason for using any
const applyApiUrlTransforms = <T extends z.ZodObject<any>>(schema: T) =>
  schema
    .superRefine((data, ctx) => {
      Object.keys(platformApiUrlFields).forEach((field) => {
        if (!data[field] && !data.API_ORIGIN) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Either ${field} or API_ORIGIN must be provided`,
            path: [field],
          });
        }
      });
    })
    .transform((data) => ({
      ...data,
      ...Object.fromEntries(
        Object.entries(platformApiUrlFields).map(([field, path]) => [
          field,
          data[field] ?? `${data.API_ORIGIN}${DEFAULT_API_BASE_PATH}${path}`,
        ])
      ),
    })) as any as z.ZodEffects<
    T,
    z.infer<T> & { [K in keyof typeof platformApiUrlFields]: string }
  >;

export const serverSchema = applyApiUrlTransforms(baseServerSchema);

export const baseClientSchema = z.object(
  Object.fromEntries(
    Object.entries(configFields)
      .filter(([, { public: isPublic }]) => isPublic)
      .map(([key, { schema }]) => [key, schema])
  )
) as z.ZodObject<{
  [K in keyof typeof configFields as (typeof configFields)[K]['public'] extends true
    ? K
    : never]: (typeof configFields)[K]['schema'];
}>;

export const clientSchema = applyApiUrlTransforms(baseClientSchema);

export type ServerConfig = z.infer<typeof serverSchema>;
export type ClientConfig = z.infer<typeof clientSchema>;
