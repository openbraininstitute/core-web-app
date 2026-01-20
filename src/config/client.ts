import { baseClientSchema, type ClientConfig, clientSchema } from '@/config/schema';

declare global {
  interface Window {
    __ENV__?: Record<string, string>;
  }
}

const isBuildTime =
  typeof window === 'undefined' && process.env.NEXT_PHASE === 'phase-production-build';

let cachedConfig: ClientConfig | null = null;

function getClientConfig(): ClientConfig {
  if (cachedConfig) return cachedConfig;

  // During build time, return empty object to avoid validation errors
  if (isBuildTime) {
    return {} as ClientConfig;
  }

  const env = typeof window === 'undefined' ? process.env : window.__ENV__ || process.env;

  const result = clientSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid client configuration: ${result.error.message}`);
  }

  cachedConfig = result.data;
  return cachedConfig;
}

export const clientConfig = new Proxy({} as ClientConfig, {
  get(_, prop) {
    return getClientConfig()[prop as keyof ClientConfig];
  },
});

export function getClientEnvInjectionConfig() {
  // On server side, read directly from process.env to avoid caching issues
  const env = typeof window === 'undefined' ? process.env : {};
  const clientEnvKeys = Object.keys(baseClientSchema.shape);
  
  return Object.fromEntries(
    clientEnvKeys
      .map((key) => {
        const value = env[key];
        return [key, value];
      })
      .filter(([, value]) => value !== undefined)
  );
}
