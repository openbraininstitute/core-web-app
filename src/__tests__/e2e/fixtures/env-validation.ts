/**
 * environment variable validation for E2E tests
 * validates that all required environment variables are set before test execution
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
 * validates that all required e2e environment variables are set
 * @returns an object containing all required environment variable values
 * @throws error listing all missing variable names if any are unset
 */
export function validateEnv(): EnvConfig {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required E2E environment variables: ${missing.join(', ')}`);
  }

  return REQUIRED_ENV_VARS.reduce<EnvConfig>((acc, key) => {
    const value = process.env[key];
    if (value === undefined) {
      throw new Error(`Missing required E2E environment variable: ${key}`);
    }
    acc[key] = value;
    return acc;
  }, {} as EnvConfig);
}
