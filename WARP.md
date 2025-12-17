# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is the Blue Brain Open Platform's core web application - a Next.js-based platform for neuroscience research, data exploration, and computational modeling. The application provides features for virtual labs, data visualization, simulations, and AI-powered assistance.

## Common Commands

### Development

```bash
# Start development server (uses turbopack)
npm run dev
# or
yarn dev

# Access at http://localhost:3000
```

### Building

```bash
# Production build
npm run build

# Start production server
npm run start

# Analyze bundle size
npm run analyze
```

### Testing

```bash
# Run unit tests (Vitest)
npm run test

# Run tests in CI mode
npm run test:ci

# Run E2E tests (Playwright)
pnpm exec playwright test --headed

# Run E2E tests in UI mode
npm run e2e:ui

# Run E2E tests against staging
npm run e2e:staging

# Run E2E tests with mocked API
npm run e2e:mock
```

### Linting & Code Quality

```bash
# Run full lint (ESLint + TypeScript)
npm run lint

# Run only ESLint
npm run lint:only

# Auto-fix linting issues
npm run lint:fix

# Type check only
npm run typecheck

# Type check in watch mode
npm run typecheck:watch

# Check code formatting
npm run prettier:check

# Apply code formatting
npm run prettier:write

# Find unused exports and dependencies
npm run knip
```

### Docker

```bash
# Show available Make commands
make help

# Build Docker image
make build

# Run Docker container
make run

# Stop container
make stop

# Clean up Docker resources
make clean
```

### Version Management

```bash
# Show current version (git-based)
make version
```

## Architecture

### Tech Stack

- **Framework**: Next.js 15 with App Router and Turbopack
- **Language**: TypeScript 5.5
- **UI**: React 19, Ant Design 5, Radix UI, Tailwind CSS 4
- **State Management**: Jotai (atoms), TanStack Query (server state)
- **3D/Visualization**: React Three Fiber, Plotly.js, D3
- **Authentication**: NextAuth.js with Keycloak
- **Testing**: Vitest (unit), Playwright (E2E)
- **Monitoring**: Sentry
- **CMS**: Sanity

### Directory Structure

#### `/src/app/`

Next.js App Router structure with:

- `/api/` - API route handlers
- `/app/` - Main authenticated application routes
- `/[sanitySectionSlug]/` - Dynamic CMS content pages
- Error boundaries (`error.tsx`, `global-error.tsx`, `not-found.tsx`)

#### `/src/features/`

Feature-specific modules with co-located logic:

- `brain-atlas-viewer/` - 3D brain visualization
- `cell-composition/` - Cell type composition analysis
- `entities/` - Entity-specific detail views (e-models, morphologies, etc.)
- `ephys-viewer/` - Electrophysiology data visualization
- `model-analysis/` - Model validation and analysis
- `small-microcircuit/` - Small-scale circuit simulations
- `views/` - Reusable view components for listings and browsing

#### `/src/components/`

Shared React components organized by domain:

- `ai-assistant/` - AI chat interface and tools
- `VirtualLab/` - Virtual lab management and creation flows
- `LandingPage/` - Public-facing marketing components
- `documentation/` - Help and documentation UI
- `icons/` - Icon components

#### `/src/api/`

API client modules organized by service:

- `apiClient.ts` - Base API client with auth
- `entitycore/` - Entity management API
- `virtual-lab-svc/` - Virtual lab management API
- `auth-manager/` - Authentication API
- `sanity/` - CMS API
- `thumbnail-svc/`, `one/`, etc. - Platform services

#### `/src/state/`

Jotai atoms for global state:

- `session.ts` - User session state
- `theme.ts` - Theme preferences
- `explore-section/` - Data exploration state
- `virtual-lab/` - Virtual lab context state

#### `/src/query-provider/`

TanStack Query configuration:

- Query client setup with caching strategies
- Server/client providers for React Server Components
- See `examples.md` for usage patterns

#### `/src/config/`

Runtime configuration system (see `/src/config/README.md`):

- **Server config**: `import { serverConfig } from '@/config/server'`
- **Client config**: `import { useConfig } from '@/config'` (React) or `import { config } from '@/config'` (non-React)
- Configuration values must be accessed inside functions, not during script evaluation
- Public/private separation enforced by Zod schemas
- API URL fallback to `API_ORIGIN` for platform services

#### `/src/ui/`

Reusable UI components and segments:

- `molecules/` - Composite UI components
- `segments/` - Page sections and complex UI patterns

#### `/src/hooks/`

Custom React hooks for shared logic

#### `/src/utils/` and `/src/util/`

Utility functions (note: both directories exist)

#### `/src/types/`

Shared TypeScript types and interfaces

### State Management Patterns

**Jotai (Client State)**

- Atomic state management with fine-grained reactivity
- Use `atom()` for state, `useAtom()` for read/write, `useAtomValue()` for read-only
- Atoms are stored in `/src/state/` organized by feature
- Example: Session state, theme, UI preferences

**TanStack Query (Server State)**

- Server state caching with automatic refetching
- Use `useQuery()` for reads, `useMutation()` for writes
- Query keys follow convention: `['entityType', id, ...params]`
- See `/src/query-provider/examples.md` for patterns

### Configuration System

The app uses a runtime configuration system for "build once, deploy everywhere":

1. **Never import config at module level** - only access inside functions
2. **Server-side**: Use `serverConfig` from `@/config/server`
3. **Client components**: Use `useConfig()` hook from `@/config`
4. **Client utilities**: Use `config` from `@/config`
5. All config is validated with Zod at runtime
6. Environment variables are injected via `window.__ENV__` for client

### Path Aliases

TypeScript path alias `@/*` maps to `src/*`:

```typescript
import { useConfig } from '@/config';
import { MyComponent } from '@/components/MyComponent';
```

### Authentication

- NextAuth.js with Keycloak integration
- Protected routes use middleware (`middleware.ts`)
- Session management via `useSession()` hook
- Custom fetch wrapper with auth: `auth-fetch.ts`

### API Communication

- Base API client in `src/api/apiClient.ts` handles auth headers
- Service-specific clients in `src/api/[service-name]/`
- Uses TanStack Query for data fetching with proper caching
- Error handling with custom error types in `src/api/error.ts`

### 3D Visualization

- React Three Fiber for WebGL rendering
- Custom morphology viewers in `/src/components/MorphoViewer/`
- Brain atlas viewer with GLTF support
- Performance optimization with web workers (via Comlink)

### Styling

- Tailwind CSS 4 for utility-first styling
- Ant Design components with custom theme
- CSS modules for component-scoped styles
- Radix UI for unstyled, accessible primitives

### Testing Conventions

**Unit Tests (Vitest)**

- Located in `/tests/` directory
- Use Testing Library for component tests
- Mock MSW for API mocking
- File pattern: `*.test.ts` or `*.test.tsx`

**E2E Tests (Playwright)**

- Located in `/e2e/` directory
- Auth state stored in `playwright/.auth/user.json`
- Setup tests in `auth.setup.ts`
- Supports multiple API modes (staging, mock)

### Code Quality

**ESLint Configuration**

- Extends: Airbnb, Airbnb TypeScript, Next.js, Prettier
- Uses `@typescript-eslint` for TypeScript rules
- Import order enforced with CSS imports after code
- Unused vars with `_` prefix are ignored

**Prettier Configuration**

- Print width: 100
- Single quotes, trailing commas (ES5)
- Uses Tailwind CSS plugin for class sorting

### Model Building Configuration

The application supports complex model building workflows with KG-based configuration. See `/docs/model-config.md` for the entity structure including:

- Cell composition, position, and morphology assignment
- E-Model assignment and validation
- Macro/micro connectome configuration
- Configuration stored as JSON/Arrow files in the knowledge graph

### Environment Variables

The application requires numerous environment variables. Key categories:

**Authentication** (server-only):

- `KEYCLOAK_ISSUER`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`
- `NEXTAUTH_SECRET`

**APIs** (public):

- `API_ORIGIN` - Base URL for platform services
- `VIRTUAL_LAB_API_URL`, `ENTITY_CORE_URL`, `NOTEBOOK_API_URL`, etc.
- Individual service URLs fall back to `API_ORIGIN` if not set

**Configuration** (public):

- `APP_VERSION`, `DEPLOYMENT_ENV`
- `ROOT_ROUTE`, `CDN_URL`

**External Services**:

- Sentry, Stripe, Matomo, Sanity, GitHub, Mailchimp
- See `/src/config/README.md` for complete list

### Deployment

- Docker-based deployment with standalone output
- Uses `standalone` output mode for optimized container size
- Multi-stage build with caching
- Version derived from git tags via Makefile
- CDN support with `CDN_URL` and `APP_VERSION` for cache busting

### Special Conventions

1. **Component Organization**: Features co-locate all related code (components, hooks, state, types)
2. **Naming**: Use `SCREAMING_SNAKE_CASE` for config/env vars, `kebab-case` for files/folders
3. **Exports**: Prefer named exports over default exports (except for Next.js pages/layouts)
4. **Error Handling**: Use `react-error-boundary` for component-level error boundaries
5. **Performance**: Large lists use `@tanstack/react-virtual` for virtualization
6. **Workers**: CPU-intensive operations use Web Workers via Comlink

### Build & Bundle

- Turbopack for fast development builds
- Custom loader rules for `.groq`, `.vert`, `.frag` files
- Bundle analyzer available via `npm run analyze`
- Ignores ESLint and TypeScript errors during build (validated separately)
