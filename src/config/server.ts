import { serverSchema, type ServerConfig } from './schema';

let cachedConfig: ServerConfig | null = null;
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

function getServerConfig(): ServerConfig {
  if (cachedConfig) return cachedConfig;

  // During build time, return empty object to avoid validation errors
  if (isBuildTime) {
    return {} as ServerConfig;
  }

  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Invalid server configuration: ${result.error.message}`);
  }

  cachedConfig = result.data;
  return cachedConfig;
}

export const serverConfig = new Proxy({} as ServerConfig, {
  get(_, prop) {
    return getServerConfig()[prop as keyof ServerConfig];
  },
});
