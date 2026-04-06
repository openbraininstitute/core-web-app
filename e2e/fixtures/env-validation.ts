/**
 * Environment variable validation for E2E tests.
 * Validates that all required environment variables are set before test execution.
 */

export interface EnvConfig {
  VIRTUAL_LAB_API_URL: string;
  KEYCLOAK_ISSUER: string;
  KEYCLOAK_CLIENT_ID: string;
  KEYCLOAK_CLIENT_SECRET: string;
  E2E_TEST_USERNAME: string;
  E2E_TEST_PASSWORD: string;
}

const REQUIRED_ENV_VARS: readonly (keyof EnvConfig)[] = [
  'VIRTUAL_LAB_API_URL',
  'KEYCLOAK_ISSUER',
  'KEYCLOAK_CLIENT_ID',
  'KEYCLOAK_CLIENT_SECRET',
  'E2E_TEST_USERNAME',
  'E2E_TEST_PASSWORD',
] as const;

/**
 * Validates that all required E2E environment variables are set.
 * @returns An object containing all required environment variable values.
 * @throws Error listing all missing variable names if any are unset.
 */
export function validateEnv(): EnvConfig {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required E2E environment variables: ${missing.join(', ')}`);
  }

  return Object.fromEntries(REQUIRED_ENV_VARS.map((key) => [key, process.env[key]!])) as EnvConfig;
}
