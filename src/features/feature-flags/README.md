# Feature Flags

A lightweight feature flag system that enables alpha/beta features in specific deployment environments while keeping them disabled elsewhere.

## Overview

The primary goal is to enable newly developed or experimental features in specific environments (e.g., development only) while keeping them disabled in production. Flags are stored in cookies, persisting configuration between reloads while remaining available during Server Side Rendering—preventing unwanted state re-renders and content flashing.

## Key Features

- **Type-Safe**: Full TypeScript support with type inference
- **SSR Compatible**: Available during server rendering, no content flashing
- **Persistent**: Survives page reloads via cookies
- **User-Controllable**: Expose flags to users via Experimental Features panel

## Usage

### Defining Flags

Create flags in `flags.ts`:

```typescript
import { defineFlag } from './define-flag';

export const myFeatureFlag = defineFlag<boolean>({
  key: 'myFeature',
  defaultValue: false,
  values: [true, false],
  description: 'Enable my new feature',
  visible: true, // Show in Experimental Features panel
});

export const flags = [myFeatureFlag] as const;
```

### Server Components

```typescript
import { getAllFlags, setFlag } from '@/features/feature-flags';

async function MyServerComponent() {
  const flags = await getAllFlags();

  if (flags.myFeature) {
    return <NewFeature />;
  }

  return <OldFeature />;
}
```

### Client Components

```typescript
'use client';

import { useFlag, useFlags } from '@/features/feature-flags';

function MyClientComponent() {
  // Get single flag
  const myFeature = useFlag('myFeature');

  // Or get all flags
  const flags = useFlags();

  return myFeature ? <NewFeature /> : <OldFeature />;
}
```

### Updating Flags

```typescript
import { setFlag, resetFlags } from '@/features/feature-flags';

// Set a flag
await setFlag('myFeature', true);

// Reset all flags to defaults
await resetFlags();
```

## API Reference

### `defineFlag<T>(definition)`

Defines a new feature flag.

- `key`: Unique identifier
- `defaultValue`: Default value when not set (can be environment-specific via custom logic)
- `values`: Array of allowed values
- `labels`: Optional display labels for values
- `description`: Optional description
- `visible`: Whether to show in the Experimental Features panel in user profile, allowing users to toggle the flag

Note: Environment-specific behavior can be achieved by combining `defaultValue` with custom visibility logic based on deployment environment.

### `getAllFlags()`

Server action that returns all flags from cookies.

### `setFlag(key, value)`

Server action that updates a flag value and revalidates the layout.

### `resetFlags()`

Server action that clears all flags and revalidates the layout.

### `useFlags()`

Client hook that returns all flags from context.

### `useFlag(key)`

Client hook that returns a single flag value.

## Common Use Cases

- Test new features with specific users before full rollout
- Persist UI preferences (panel states, view modes) across reloads
- A/B testing different implementations
- Enable alpha/beta features (combine `defaultValue` and `visible` with environment-based logic)

## Examples

### User-Controllable Feature

```typescript
export const newEditorFlag = defineFlag<boolean>({
  key: 'newEditor',
  defaultValue: false,
  values: [true, false],
  description: 'Enable new editor experience',
  visible: true, // Users can toggle in Experimental Features panel
});
```

### Internal State (Hidden from Users)

```typescript
export const aiPanelStateFlag = defineFlag<PanelState>({
  key: 'aiPanelState',
  defaultValue: PanelState.Collapsed,
  values: Object.values(PanelState),
  description: 'State of the AI panel',
  visible: false, // Not shown in Experimental Features panel
});
```
