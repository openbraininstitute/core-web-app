# Configuration System

Runtime configuration system for "build once, deploy everywhere" deployments.

## Features

- Runtime environment variable injection
- Zod validation for type safety
- Separate server/client configs with automatic public/private separation
- Single source of truth for configuration properties
- Automatic API URL fallback to API_ORIGIN
- React Context for components
- Direct access for non-React code
- Cached for performance

## Usage

### In React Components

```typescript
'use client';
import { useConfig } from '@/config';

export function MyComponent() {
  const config = useConfig();

  return (
    <div>
      <p>API URL: {config.VIRTUAL_LAB_API_URL}</p>
      <p>Environment: {config.DEPLOYMENT_ENV}</p>
    </div>
  );
}
```

### In Server Components

```typescript
import { serverConfig } from '@/config/server';

export default function ServerComponent() {
  // Access both server and client config
  const keycloakIssuer = serverConfig.KEYCLOAK_ISSUER;
  const apiUrl = serverConfig.VIRTUAL_LAB_API_URL;

  return <div>Server Component</div>;
}
```

### In API Routes

```typescript
import { serverConfig } from '@/config/server';

export async function GET() {
  const response = await fetch(serverConfig.VIRTUAL_LAB_API_URL, {
    headers: {
      Authorization: `Bearer ${serverConfig.KEYCLOAK_CLIENT_SECRET}`,
    },
  });

  return Response.json(await response.json());
}
```

### In Client-Side Utilities (Non-React)

```typescript
import { config } from '@/config';

export function createApiClient() {
  return {
    baseUrl: config.VIRTUAL_LAB_API_URL,
    stripeKey: config.STRIPE_PUBLISHABLE_KEY,
  };
}
```

Note: `config` is an alias for `clientConfig` and only contains public properties.

### In Middleware

```typescript
import { serverConfig } from '@/config/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set('X-Root-Route', serverConfig.ROOT_ROUTE);

  return response;
}
```

## Important: Script Evaluation Timing

**Configuration parameters cannot be accessed during script evaluation (import time).** They must only be accessed inside functions that execute at runtime.

```typescript
// WRONG: Accessing config during import/evaluation
import { config } from '@/config';
const apiUrl = config.VIRTUAL_LAB_API_URL;

export function myFunction() {
  return apiUrl;
}

// CORRECT: Accessing config inside function
import { config } from '@/config';

export function myFunction() {
  const apiUrl = config.VIRTUAL_LAB_API_URL;
  return apiUrl;
}
```

This applies to both `config` (client) and `serverConfig` (server). Configuration values are only available after the module has fully loaded and the runtime environment is initialized.

## Architecture

### Schema Definition

Configuration is defined once in `configFields` object with:

- `schema`: Zod validation schema
- `public`: Boolean flag indicating if property should be exposed to client

```typescript
const configFields = {
  KEYCLOAK_CLIENT_SECRET: { schema: z.string().nonempty(), public: false },
  DEPLOYMENT_ENV: {
    schema: z.enum(['local', 'preview', 'development', 'staging', 'production']),
    public: true,
  },
  // ...
};
```

### API URL Fallback

Platform API URLs can fallback to `API_ORIGIN` if not explicitly set:

```typescript
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
};
```

For example, if `VIRTUAL_LAB_API_URL` is not provided, it defaults to `${API_ORIGIN}/api/virtual-lab-manager`.

### Server-Side

- Reads from `process.env`
- Validates with `serverSchema` (includes all properties)
- Applies API URL transforms
- Caches result
- Access via `serverConfig` proxy

### Client-Side

- Reads from `window.__ENV__` (injected via script tag) or `process.env`
- Validates with `clientSchema` (only public properties)
- Applies API URL transforms
- Caches result
- Access via `useConfig()` (React) or `config` proxy (non-React)

### Configuration Flow

```
configFields (Single Source of Truth)
         ↓
  baseServerSchema (all properties)
         ↓
  serverSchema (with API URL transforms)
         ↓
  baseClientSchema (filtered by public: true)
         ↓
  clientSchema (with API URL transforms)
         ↓
Environment Variables (Runtime)
         ↓
    process.env (Server)
         ↓
  serverConfig → Validates → Caches
         ↓
  getClientEnvInjectionConfig() → Extracts client subset
         ↓
  Injected as window.__ENV__ (Script tag in HTML)
         ↓
  ConfigProvider (React Context)
         ↓
  useConfig() or config
```

## Configuration Properties

All properties use `SCREAMING_SNAKE_CASE` naming convention.

### Adding New Properties

Add properties to `configFields` in `schema.ts`:

```typescript
const configFields = {
  // ...
  MY_NEW_PROPERTY: {
    schema: z.string().min(1),
    public: false, // true to expose to client
  },
};
```

The property will automatically be:

- Included in server schema
- Included in client schema (if `public: true`)
- Type-safe in `ServerConfig` and `ClientConfig`

### Server-Only Properties

Properties with `public: false` are only available via `serverConfig` (imported from `@/config/server`):

- `KEYCLOAK_ISSUER`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`
- `NEXTAUTH_SECRET`
- `MAILCHIMP_API_KEY`, `MAILCHIMP_AUDIENCE_ID`, `MAILCHIMP_API_SERVER` (optional)
- `GITHUB_TOKEN` (optional)

### Client & Server Properties

Properties with `public: true` are available in both contexts:

- `APP_VERSION`, `DEPLOYMENT_ENV`
- `API_ORIGIN`, `ROOT_ROUTE`, `CDN_URL` (optional)
- `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PRJ` (optional)
- Platform API URLs (optional, fallback to `API_ORIGIN`):
  - `AI_AGENT_URL`, `AUTH_MANAGER_URL`, `CELL_API_URL`
  - `ENTITY_CORE_URL`, `NOTEBOOK_API_URL`, `OBI_ONE_URL`
  - `SMALL_SCALE_SIMULATOR_URL`, `THUMBNAIL_API_URL`, `VIRTUAL_LAB_API_URL`
- `STRIPE_PUBLISHABLE_KEY`
- `MATOMO_CDN_URL`, `MATOMO_SITE_ID`, `MATOMO_URL` (optional)
- `SANITY_DATASET`
- Entity core configuration:
  - `ENTITY_CORE_PUBLIC_PROJECT_ID`, `ENTITY_CORE_PUBLIC_VIRTUAL_LAB_ID`
- Brain region configuration:
  - `BASIC_CELL_GROUPS_AND_REGIONS_BRAIN_REGION_ANNOTATION_VALUE`
  - `DEFAULT_BRAIN_ATLAS_ID`, `DEFAULT_BRAIN_REGION_HIERARCHY_ID`
  - `DEFAULT_SELECTED_BRAIN_REGION_ID`, `LEGACY_DEFAULT_CIRCUIT_ID`
  - `ROOT_BRAIN_REGION_ANNOTATION_VALUE`, `ROOT_BRAIN_REGION_ID`
- `NOTEBOOK_REPO_URL`

See `configFields` in `schema.ts` for complete list.

## Type Safety

TypeScript types are automatically inferred from Zod schemas:

```typescript
import type { ServerConfig, ClientConfig } from '@/config';

// ServerConfig includes all properties
// ClientConfig includes only public subset
```

## Validation

Configuration is validated at runtime when first accessed:

```typescript
// If VIRTUAL_LAB_API_URL is missing or invalid, this will throw
const apiUrl = serverConfig.VIRTUAL_LAB_API_URL;
```

Validation errors include detailed information about what's wrong.

### API URL Validation

For platform API URLs, either the specific URL or `API_ORIGIN` must be provided:

```typescript
// Valid: Specific URL provided
VIRTUAL_LAB_API_URL=https://api.example.com/virtual-lab-manager

// Valid: Falls back to API_ORIGIN
API_ORIGIN=https://api.example.com
// Results in: VIRTUAL_LAB_API_URL=https://api.example.com/api/virtual-lab-manager

// Invalid: Neither provided
// Error: Either VIRTUAL_LAB_API_URL or API_ORIGIN must be provided
```

## Build-Time Behavior

- During build time (`NEXT_PHASE=phase-production-build`), validation is skipped
- Empty config object is returned to avoid validation errors
- Runtime validation occurs on first access after deployment

## Performance

- Configuration is validated once and cached
- Subsequent calls return cached result via Proxy
- No performance overhead after first access
