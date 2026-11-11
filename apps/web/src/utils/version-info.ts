import { config } from '@/config';

export function getVersionInfo() {
  return {
    time: new Date().toISOString(),
    version: process.env.APP_VERSION,
    buildTime: process.env.APP_BUILD_TIME,
    nodeVersion: process.version,
    deploymentEnvironment: config.DEPLOYMENT_ENV,
  };
}
