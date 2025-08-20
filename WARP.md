# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is the Blue Brain Open Platform's core web application - a Next.js 15 application built with TypeScript, React 19, and Turbopack. The platform provides neuroscience research tools including circuit simulation, morphology visualization, and data exploration capabilities.

## Development Commands

### Package Management

Uses `pnpm` as the package manager with workspaces enabled.

```bash
# Install dependencies
pnpm install

# Development server with Turbopack
pnpm dev
# Alternative dev environment
pnpm dev:next

# Production build
pnpm build

# Start production server
pnpm start
```

### Code Quality & Testing

```bash
# Linting (ESLint + TypeScript checking)
pnpm lint
# ESLint only
pnpm lint:only
# Fix linting issues
pnpm lint:fix

# Code formatting
pnpm prettier:check
pnpm prettier:write

# Type checking
pnpm typecheck
pnpm typecheck:watch

# Unit tests (Vitest)
pnpm test
pnpm test:ci

# End-to-end tests (Playwright)
pnpm e2e              # Headed mode
pnpm e2e:ci           # CI mode
pnpm e2e:ui           # UI mode
pnpm e2e:staging      # Against staging
pnpm e2e:mock         # Mock API mode

# Bundle analysis
pnpm analyze

# Dependency analysis
pnpm knip
```

### Docker Development

```bash
# Using Makefile (recommended)
make build          # Build Docker image with commit SHA
make run           # Run container
make run-detached  # Run in background
make stop          # Stop container
make clean         # Clean up Docker resources
make logs          # View container logs
make rebuild       # Rebuild and restart

# Direct docker-compose
docker-compose -f docker-compose.dev.yml up --build
```

## Architecture Overview

### State Management

- **Jotai**: Primary state management with atom-based reactive state
- **Atom Families**: Used for parameterized state (e.g., `dataAtom`, `detailFamily`)
- **TTL Atoms**: Custom atom families with expiration for data caching
- **Session State**: NextAuth.js integration for authentication state

### Key State Patterns

```typescript
// Atom families with expiration
const dataAtomFamily = readAtomFamilyWithExpiration(
  (param) =>
    atom(async () => {
      /* fetch logic */
    }),
  { ttl: 120000, areEqual: isEqual }
);

// Parameterized atoms for different data scopes
const pageNumberAtom = atomFamily((_key: string) => atom<number>(DEFAULT_PAGE_NUMBER));
```

### API Architecture

- **Entity Core**: Primary data layer using standardized entity types
- **Query Provider**: TanStack Query for server state management
- **Transformers**: Data transformation layer between API and UI
- **Asset Downloads**: Specialized handling for scientific data files (NWB, SWC, etc.)

### UI Architecture

- **Ant Design**: Primary component library with custom theming
- **Radix UI**: Low-level components for complex interactions
- **CSS Modules**: Component-scoped styling with Tailwind CSS
- **Next.js App Router**: File-based routing with nested layouts

### Data Visualization

- **React Three Fiber**: 3D visualizations for morphologies and circuits
- **Plotly.js**: Scientific plotting and data visualization
- **D3**: Custom data visualizations and Sankey diagrams
- **MorphoViewer**: Specialized neuronal morphology rendering

### Environment Configuration

Environment variables are strictly typed using `@t3-oss/env-nextjs` in `src/env.ts`. Multiple deployment environments are supported via `.deployment-envs/` folder.

## Key Development Patterns

### Component Structure

```
components/
├── ComponentName/
│   ├── index.tsx              # Main component
│   ├── component.module.css   # Scoped styles
│   ├── types.ts              # Component types
│   └── utils.ts              # Component utilities
```

### State Atom Organization

```
state/
├── explore-section/           # Feature-specific atoms
├── morpho-viewer/            # Visualization atoms
└── session.ts               # Global session atom
```

### Entity Configuration

The app uses a sophisticated entity configuration system in `src/entity-configuration/` that defines:

- Field definitions and validations
- View definitions for different data types
- API query configurations
- Data transformers

### Known Issues & Workarounds

- **usePathname Hook**: Custom implementation in `@/src/hooks/pathway` to handle basePath
- **Jotai Reactivity**: Avoid combining `selectAtom` and `loadable` - use derived atoms instead
- **ESM Modules**: Several packages mocked in Jest config due to ESM compatibility issues

### Testing Architecture

- **Vitest**: Unit testing with JSX support
- **Playwright**: E2E testing with multiple browser configurations
- **Testing Library**: React component testing utilities
- **MSW**: Mock service worker for API mocking

### Git Hooks (Lefthook)

Pre-commit hooks run:

- ESLint with auto-fix
- Prettier formatting
- TypeScript type checking

### Specialized Features

- **Small-Scale Simulator**: Circuit simulation interface
- **Virtual Lab Management**: Multi-tenant workspace system
- **Notebook Integration**: Jupyter notebook rendering and execution
- **Scientific Data Formats**: HDF5, NWB, SWC file handling
- **3D Morphology Viewer**: WebGL-based neuronal structure visualization

## Development Tips

- Use `pnpm dev` for fastest development with Turbopack
- Monitor state changes with Jotai DevTools (enabled in development)
- Test different environments using `.env` files in `.deployment-envs/`
- Use Docker development for production-like testing
- Leverage the entity configuration system when adding new data types
- Follow the established atom family patterns for consistent state management
