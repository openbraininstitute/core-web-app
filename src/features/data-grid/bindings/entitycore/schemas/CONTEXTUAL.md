# Contextual column presentation

Entity tables adapt to the runtime **context** — which `dataType`, `section`,
`scope`, `species`, and any host-supplied **factor** (role, feature flag, view
variant, device…) the table renders under. A schema declares, per column, *whether*
it appears (`available`), *where* it sits (`order`), *whether* it starts hidden
(`hiddenByDefault`), and *whether* its filter is offered (`filter.available`).

This is the successor to the legacy `matchesFieldApiWhen` / `resolveContextualValue`
engine (`entity-configuration/definitions/listing.ts`), generalised to be extensible
(any factor), composable (catalog default + schema override), and declarative
(plain, inspectable data).

## The three authoring forms

Every contextual facet accepts one of three interchangeable forms:

```ts
import { byContext } from '@/features/data-grid/core';

// 1) constant — the common case
nameColumn({ available: true })

// 2) predicate — imperative escape hatch
nameColumn({ available: (ctx) => ctx.scope === 'project' })

// 3) declarative rules — preferred for anything non-trivial
speciesColumn({
  available: byContext({
    default: true,
    rules: [
      { when: { section: 'build' }, value: false },              // hide while building
      { when: { section: 'build', scope: 'project' }, value: true }, // …except project builds
    ],
  }),
})
```

**Rule semantics** (identical to the legacy engine):

- a rule's `when` keys are **AND**-ed; a list value inside a key is **OR**-ed; an
  omitted key does not constrain.
- resolution starts at `default`, then each matching rule applies **in order** — the
  **last matching rule wins**, so put specific rules after general ones.
- an optional `matches: (ctx) => boolean` on a rule is an extra imperative gate,
  evaluated only when `when` already matched.

## "Where" — contextual order

`order` is a position weight; columns sort by ascending resolved `order`, and columns
without one keep their declaration slot. A column can therefore move by context:

```ts
contributionsColumn({
  order: byContext({ default: 6, rules: [{ when: { section: 'explore' }, value: 0 }] }),
})
```

## Extensibility — new factors, no core change

`GridContext.factors` is an open bag. The host passes whatever dimensions it has:

```ts
new GridController({
  schema,
  context: { dataType, section, scope, species, factors: { role, betaTables: true } },
  ...
})
```

Rules match factors by name with zero core changes:

```ts
available: byContext({ rules: [{ when: { role: 'admin', betaTables: true }, value: true }] })
```

## Composition — catalog default + schema override

Column-catalog factories can ship a sensible default rule set; a specific schema
layers extra rules on top via `mergeColumnDef` (the override's rules evaluate after
the catalog's, so they win on conflict while the base still applies elsewhere). A
constant/function override replaces the base outright — explicit intent.

## Where it's resolved

`core/domain/resolve-schema.ts#resolveColumns(schema, ctx)` is the single place these
rules run; it returns the context-resolved, ordered column list. The controller seeds
the initial column order + default-hidden set from it, and the user's persisted
drag-reorder / chooser layout is applied on top. All resolution is pure and unit
tested (`core/domain/contextual.test.ts`, `resolve-schema.test.ts`).
