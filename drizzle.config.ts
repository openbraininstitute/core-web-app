import { defineConfig, Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import { env } from '@/env';

dotenv.config({ path: '.env.local' });

export default defineConfig({
  schema: './src/services/auth-manager/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.AUTH_MANAGER_DATABASE_URL!,
  },
  verbose: true,
  strict: true,
}) as Config;
