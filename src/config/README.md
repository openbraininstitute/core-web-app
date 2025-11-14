# Configuration System

Runtime configuration system for "build once, deploy everywhere" deployments.

## Features

- ✅ Runtime environment variable injection
- ✅ Zod validation for type safety
- ✅ Separate server/client configs
- ✅ React Context for components
- ✅ Direct access for non-React code
- ✅ Cached for performance

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
import { getServerConfig } from '@/config';

export default function ServerComponent() {
  const config = getServerConfig();

  // Access both server and client config
  const keycloakIssuer = config.KEYCLOAK_ISSUER;
  const apiUrl = config.VIRTUAL_LAB_API_URL;

  return <div>Server Component</div>;
}
```

### In API Routes

```typescript
import { getServerConfig } from '@/config';

export async function GET() {
  const config = getServerConfig();

  const response = await fetch(config.VIRTUAL_LAB_API_URL, {
    headers: {
      Authorization: `Bearer ${config.KEYCLOAK_CLIENT_SECRET}`,
    },
  });

  return Response.json(await response.json());
}
```

### In Client-Side Utilities (Non-React)

```typescript
import { getClientConfig } from '@/config';

export function createApiClient() {
  const config = getClientConfig();

  return {
    baseUrl: config.VIRTUAL_LAB_API_URL,
    stripeKey: config.STRIPE_PUBLISHABLE_KEY,
  };
}
```

### In Middleware

```typescript
import { getServerConfig } from '@/config';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const config = getServerConfig();

  const response = NextResponse.next();
  response.headers.set('X-Base-Path', config.BASE_PATH);

  return response;
}
```

## Architecture

### Server-Side

- Reads from `process.env`
- Validates with Zod schema
- Caches result
- Access via `getServerConfig()`

### Client-Side

- Reads from `window.__ENV__` (injected via script tag)
- Validates with Zod schema
- Caches result
- Access via `useConfig()` (React) or `getClientConfig()` (non-React)

### Configuration Flow

```
Environment Variables (Runtime)
         ↓
    process.env (Server)
         ↓
  getServerConfig() → Validates → Caches
         ↓
  getClientConfigForInjection() → Extracts client subset
         ↓
  Injected as window.__ENV__ (Script tag in HTML)
         ↓
  ConfigProvider (React Context)
         ↓
  useConfig() or getClientConfig()
```

## Configuration Properties

All properties use `SCREAMING_SNAKE_CASE` naming convention.

### Server-Only

Properties only available via `getServerConfig()`:

- `KEYCLOAK_ISSUER`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`
- `NEXTAUTH_SECRET`
- `MAILCHIMP_API_KEY`, `MAILCHIMP_AUDIENCE_ID`, `MAILCHIMP_API_SERVER`

### Client & Server

Properties available in both contexts:

- `BASE_PATH`, `CDN_URI`
- `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PRJ`
- `VIRTUAL_LAB_API_URL`, `ENTITY_CORE_URL`
- `STRIPE_PUBLISHABLE_KEY`, `DEPLOYMENT_ENV`
- And many more (see schema.ts)

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
const config = getServerConfig();
```

Validation errors include detailed information about what's wrong:

```
ZodError: [
  {
    "code": "invalid_string",
    "validation": "url",
    "path": ["VIRTUAL_LAB_API_URL"],
    "message": "Invalid url"
  }
]
```

## Performance

- Configuration is validated once and cached
- Subsequent calls return cached result
- No performance overhead after first access

## Testing

For testing, you can mock the config:

```typescript
import { useConfig } from '@/config';

jest.mock('@/config', () => ({
  useConfig: () => ({
    VIRTUAL_LAB_API_URL: 'https://test.example.com',
    DEPLOYMENT_ENV: 'local',
    // ... other required properties
  }),
}));
```
