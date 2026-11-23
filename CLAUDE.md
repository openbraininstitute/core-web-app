# core-web-app: team rules

## Part 1: Team rules

### 1. Naming types
- Every `type` starts with `T`: `TUser`, `TCircuitRow`, `TPreviewProps`.
- Every `interface` starts with `I`: `ISession`, `IGridPlugin`.

### 2. Feature first
- A new feature gets its own folder in `src/features/<feature-name>/`.
- Do not spread one feature across `src/components`, `src/util`, `src/hooks`, etc.

### 3. Components: reuse before you build
Before writing a component, search for one that already exists:
1. `src/ui/molecules/` for single building blocks (button, input, select, modal, tabs, tooltip, ...).
2. `src/ui/segments/` for larger pieces built from several molecules.

Then:
- **It exists and fits**: use it.
- **It exists but needs a change or a new prop**: change that component. Do not create a second one next to it.
- **It does not exist**: build it in the right place: a single block goes in `src/ui/molecules/`, a combination of molecules goes in `src/ui/segments/`.

### 4. One file per kind of code inside a feature
- **Types**: all types of a feature go in that feature's `types.ts`. Do not spread them across files.
- **Helpers and utilities**: go in that feature's `helpers.ts`; use `helpers.tsx` when helpers return JSX or mix components with functions.
- Create a new file only when the code is big enough to need its own file.

### 5. No `switch`, no if/else chains
Use [`ts-pattern`](https://github.com/gvergnaud/ts-pattern) (`match(...).with(...)`) instead of `switch` statements.
The same goes for successive `if` / `else if` chains and nested ternaries that pick one of three or more outcomes:
`match(kind).with(Kind.A, ...).with(Kind.B, ...).exhaustive()`, or `.when(...)` / `P.when` for conditions.
A single guard clause (`if (isNil(x)) return;`) and a plain two-way ternary stay as they are.

### 6. API calls live in `src/api/`
- New entitycore requests go in `src/api/entitycore/` (requests in `queries/<domain>/<entity>.ts`, types in `types/`).
- Other services follow the same rule, each in its own folder: `src/api/one/`, `src/api/small-scale-simulator/`, `src/api/thumbnail-svc/`, `src/api/virtual-lab-svc/`, `src/api/entity-download/`, ...
- A new service gets a new folder in `src/api/`.
- Components and features call these functions; they do not build request URLs themselves.
- An entitycore entity type is built from the base types in `src/api/entitycore/types/shared/global.ts`
  (`EntityCoreIdentifiableNamed`, `Timestamps`, `EntityAuthorization`, `IAsset`, `IPlatformUser`, ...) with `extends`, `Pick` and `Omit`.
  Add only the fields that are new for that entity. A shape that more than one entity shares goes in `shared/`, not in the entity's file.

### 7. Tests live in `src/__tests__/`
- All tests go in `src/__tests__/<feature-name>/`, mirroring the feature's folders
  (example: `src/features/entity-download/file-handlers/` is tested in `src/__tests__/entity-download/file-handlers/`).
- Do not put new test files next to the source file.

### 8. Options are a dictionary first
A value with a fixed set of options is a PascalCase `as const` object, and its type is derived from it.
Compare against the dictionary, never against the raw string.
```ts
const AuthStatus = { Authenticated: 'authenticated', Loading: 'loading' } as const;
type TAuthStatus = (typeof AuthStatus)[keyof typeof AuthStatus];

if (status === AuthStatus.Authenticated) { ... }
```

### 9. Server data uses TanStack Query, not Jotai
- Anything fetched from a server is TanStack Query.
- Jotai atoms only hold synchronous UI state.

### 10. One wrapper hook per library
Wrap a library hook once and use the wrapper everywhere (example: `useAuthSession()` wraps Better Auth's `useSession`).
Components never call the library hook directly.

### 11. No narrative comments
- Default to no comment.
- At most one short factual line (`/** ... */`) on an exported symbol whose name is not clear enough.
- No comments that tell the story of a fix, the alternatives tried, or measurements. That goes in the PR description.

### 12. Change only what was asked
When restyling or migrating UI, change only what the task asks for. No extra frames, labels or copy.
If something does not fit the requested pattern, leave it as it is and say so in the PR.

### 13. Colours come from the project palette
Use only colours defined in the `@theme` block of `src/styles/globals.css` (`primary-*`, `neutral-*`, `secondary-*`, `destructive`, `green-main`, ...).
shadcn tokens (`border`, `input`, `ring`, `foreground`, `muted-foreground`, `popover`) are not defined, so classes such as `border-input` or `text-muted-foreground` render nothing. Map them:
border `neutral-2`, focus `primary-8`, text `primary-9`, muted `neutral-4`, placeholder `neutral-3`, error `destructive`, success `green-main`.

### 14. React Compiler is on: do not read a store during render
Do not call a method that reads a store's snapshot inside render (example: `controller.buildQuery()` reading `store.getSnapshot()`).
The compiler cannot see that read and keeps a stale value. Pass the reactive `state` (from `useSyncExternalStore`) into a pure function instead.

### 15. Heavy client libraries load lazily
- WebGL viewers, code highlighters and other heavy libraries load with `dynamic(() => import(...), { ssr: false })` or `await import(...)` when used.
- Keep plain constants and types out of files that import `@tolokoban/tgd`: that package touches `document` when imported and breaks server rendering.

### 16. Fetch related entities with `expand`
When an entitycore query needs related entities, request them with entitycore `expand` instead of extra requests.
Expand types live in `src/api/entitycore/types/shared/expand.ts`.

### 17. Browser storage keys
Format: `<area>:<yyyymmdd><n>:<full-word slice>:<key>`, e.g. `data-grid:202611091:state:data/cell_morphology/combined`.
The version is the date of the format change plus that day's counter, kept in one constant.
Do not rename a key that holds saved user data (it wipes their data); `data-grid:v1:l:` stays as it is.


### 18. Test IDs for UI tests
Elements that tests need get a `data-testid` in kebab-case (`data-view-breadcrumb`, `metadata-grid`).

### 19. Unit tests and shared state
`vitest.config.ts` runs files that use `vi.mock` / `vi.doMock` isolated, and all other files in a shared worker.
A test that passes alone but fails in the full run is leaking state: add the reset to the `afterAll` in `vitest.setup.ts`.

### 20. Commit and PR titles
Conventional prefix, then a plain sentence that says what changes for the user:
`feat(thumbnail): read the thumbnail service's RFC 9457 errors`, `fix(data): keep a listing's filters ...`, `perf: ...`, `chore: ...`, `test(scope): ...`.

### 21. React Query keys live in one place
- Every query key comes from a key builder in `src/ui/use-query-keys/` (`keyBuilder`, `keyBuilderAtlas`, `keyBuilderAI`, ...).
- Never write a key inline (`queryKey: ['data', id]`). Add it to the builder of its area, or create a new builder file there for a new area.
- Invalidate and prefetch with the same builder, so the key used to read and the key used to invalidate can never drift apart.

### 22. Run React Doctor before pushing
- `git push` runs React Doctor on the changes versus `main` (the `pre-push` hook in `lefthook.yml`). A new error blocks the push; warnings are shown but do not block.
- Run it yourself after a change: `pnpm exec react-doctor . --scope changed --no-supply-chain --no-score --verbose`
- Fix what it finds before pushing. Do not skip the hook (`--no-verify`) to get past it.

### 23. Merge classes with `cn`
- When classes are combined or depend on a condition, use `cn` from `src/utils/css-class.tsx` (clsx + tailwind-merge).
- No template strings (`` `${BASE} px-2` ``), `+` or `[...].join(' ')` to build a `className`: write `cn(BASE, 'px-2', open && 'bg-primary-0')`.
- A fixed class list with no condition stays a plain string.
