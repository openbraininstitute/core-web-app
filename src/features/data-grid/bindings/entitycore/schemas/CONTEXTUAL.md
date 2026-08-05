# Contextual rules

> Recipes live in [`features/data-grid/GUIDE.md`](../../../GUIDE.md). This file is the
> rule engine those recipes link to.

A grid renders under a **context**, and a schema can make almost any presentation
decision depend on it — so one schema serves the browse listing, the workflow picker
and the detail tab without forking.

## The context

```ts
interface IGridContext {
  dataType: string;
  section?: string;   // 'data' | 'build' | 'workflows' | …
  scope?: string;     // 'public' | 'project'
  species?: string;   // 'all' or a hierarchy id
  factors?: Record<string, string | number | boolean>; // open, host-defined
}
```

Flat and scalar on purpose: `when` matching and query-key memoisation stay cheap.

## What is contextual

| Field | On | Meaning |
| --- | --- | --- |
| `available` | column | whether the column exists at all; `false` drops it, chooser included |
| `order` | column | position weight, ascending; no value keeps the declaration slot |
| `hiddenByDefault` | column | present but unticked until the user asks for it |
| `filter.available` | column filter | whether the filter is offered |
| `available` | filter target | whether one "match by" target is offered |
| `available` | advanced filter | whether a panel entry is offered |
| `sortable` | **schema** | whole-grid gate; `false` forces `sortable: false` on every column |
| `selection.enabled` | **schema** | whether the grid offers row selection |

**Not contextual, by design:** `auxiliary`, `essential`, `movable`. These describe the
column's role in the schema, not one view of it, so they take a plain boolean. Passing
`byContext` to them will not work.

## The three forms

```ts
import { byContext } from '@/features/data-grid/core';

available: true                                   // constant — the common case
available: (ctx) => ctx.scope === 'project'       // predicate — escape hatch
available: byContext({                            // rules — preferred when non-trivial
  default: true,
  rules: [
    { when: { section: 'build' }, value: false },
    { when: { section: 'build', scope: 'project' }, value: true },
  ],
})
```

**Resolution:** start at `default`, then apply every matching rule **in order** —
**last match wins**, so put specific rules after general ones.

**Matching:** keys inside one `when` are AND-ed; an array value inside a key is OR-ed;
an omitted key does not constrain. An optional `matches: (ctx) => boolean` is an extra
gate, evaluated only once `when` has matched.

## Factors

`factors` is an open bag — the host passes whatever dimensions it has, and rules match
them by name with no core change:

```ts
// host
new GridController({ schema, context: { dataType, section, factors: { view: 'hierarchy' } } })

// schema
available: byContext({ default: false, rules: [{ when: { view: 'hierarchy' }, value: true }] })
```

A plugin body can inject factors via `extraFactors` — memoise it, since a new object
identity rebuilds the controller. `CircuitGridBody` does this to publish the
flat↔hierarchy view.

## Composition

A catalog factory can ship default rules; a schema layers more on top with
`mergeColumnDef` — the override's rules evaluate after the base's, so they win on
conflict while the base still applies elsewhere. A constant or function override
replaces the base outright.

## Where it runs

`core/domain/resolve-schema.ts#resolveColumns(schema, ctx)` is the only place these
rules resolve. It returns the context-resolved, ordered column list; the controller
seeds column order and the default-hidden set from it, then applies the user's
persisted layout on top.

Pure and unit tested: `src/__tests__/data-grid/core/domain/contextual.test.ts` and
`resolve-schema.test.ts`.

## Gotcha

A column gated off in one context is **absent from that context's stored
`columnOrder`**. Reconciliation re-inserts it at its declared slot when it comes back
(`core/domain/column-layout.ts`) — do not assume a stored order lists every column.

## See also

- [`GUIDE.md`](../../../GUIDE.md) — add an entity, column, filter, or gate; migration gotchas
- [`FILTERS.md`](../../../FILTERS.md) — the filter model and how an operator becomes a query param
