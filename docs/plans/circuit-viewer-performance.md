# Circuit viewer performance plan

Implementation plan for the findings of the 2026-08-26 performance review of the
somas-only large-circuit viewer (issue #240 branch). Full review with findings
F1–F9 and options O1–O8: https://claude.ai/code/artifact/d3f478f6-d6cf-4c0e-938b-72fe4ca04117

**Thesis:** the renderer no longer sets the ceiling — memory does. Positions are
held in up to four CPU representations at once, colour passes materialise
per-node JS values, and the whole SONATA H5 (~700 MB at region scale) is
resident per worker session.

Reference scale for all numbers: the 4.7 M-soma region circuit.

## Measured baselines (re-verify against these)

| Interaction | Now | Target after plan |
| --- | --- | --- |
| Orbit frame, full res | 25 ms | unchanged |
| Population switch | sub-frame | unchanged |
| Continuous colour-by redraw | ≈350 ms | < 100 ms (Phase 1) |
| Categorical colour-by redraw | unmeasured, est. 0.5–1 s | measure, then < 100 ms (Phase 1) |
| First paint after geometry | AO blocks ≈1 s | AO async (Phase 3) |
| Steady-state position memory | ≈600 MB | ≈130 MB (Phases 2+4) |

Verification circuit: `/app/virtual-lab/afcd2f0d-e742-4782-bd58-abcf77824b2d/cc48cf6a-b1af-451e-9ac9-77bdbfea0fbb/workflows/simulate/configure/region-circuit-simulation/wf_kdw56v3x0l?origin=8e971a54-c954-453a-ad3a-96f144a09b22&tactivity=simulate&ttype=region_circuit_simulation`

---

## Phase 1 — Compact colour pipeline (O1 + O2, core-web-app)

One coherent change to how colours flow.

> **Status (2026-08-26):** implemented and committed as `71d3dc39b` — one
> commit rather than two, since the palette builders were rewritten in place
> and a string-emitting intermediate would not have built. Vitest green,
> biome clean, tsc delta clean. The in-browser exit measurement (continuous
> redraw < 100 ms at 4.7 M) is still to be taken on the verification circuit.

### 1a. Transferable column payloads (O1, fixes F3)

`NodesSession.getColumnValues` returns compact forms it already holds instead
of materialising per-node JS values:

- numeric → the typed array itself (`Float32Array | Float64Array`); synthetic
  node id → an identity `Uint32Array`
- categorical → `{ library: string[], indices: Uint32Array }`
- string → `string[]` as today (rare, colour-by hardly uses it)

`nodes.worker.ts getColumn` transfers the buffers (`Comlink.transfer`, packing
fresh arrays like `getGeometry` already does — the LRU-cached column must be
copied before transfer or the cache detaches). Internal morphology read
(`getGeometry` → `getColumnValues(MORPHOLOGY_COLUMN)`) keeps a string path.

Touched: `worker/nodes-h5.ts:525`, `worker/nodes.worker.ts:46`,
`hooks/nodes-worker-manager.ts:142` (`LoadedColumnResult`),
`hooks/use-nodes-worker.ts:124`, `color-by/use-node-color-mapping.ts`
(the `loaded` map now retains the compact forms — that is the memory win).

### 1b. ColorMapping carries palette + columns (O2, fixes F4)

In `color-by/types.ts`, replace `colorsByNode: string[]` with:

```ts
palette: string[];              // ≤ MAX_DISTINCT_COLORS, index 0 may be the fallback
columnByNode: Uint16Array;      // palette index per node
```

- `buildCategorical`: legend work ∝ distinct values (walk `library` for
  categorical input; the ≤12-distinct numeric path keeps its Map); one N-pass
  writes `columnByNode` (for categorical input: a `Uint16Array` lookup table
  from library index → palette column, so the pass is two array reads per node).
- `buildContinuous`: min/max pass over the typed array, then one pass writing
  the stop index (0..63) directly; palette = the 64 tuned viridis stops.
- `large-circuit-preview.tsx cellColors` memo: append the receded column to
  `mapping.palette`, copy `mapping.columnByNode` into the subject's slice,
  `fill` the rest — no Map, no string dedup.
- `use-small-circuit-source.ts`: per-cell colour becomes
  `palette[columnByNode[nodeId]]`.
- Legend types (`categorical` / `continuous`) unchanged.

Tests to update: `color-by-mode-threshold.test.ts`,
`node-color-mapping-cache.test.tsx`, `circuit-color-by-population-memory.test.tsx`,
`large-circuit-preview-colors.test.tsx`, `small-circuit-source.test.tsx`.

**Exit criteria:** continuous redraw < 100 ms in-browser at 4.7 M; categorical
measured before/after; scan-config vitest suite green; biome clean.

## Phase 2 — Float32 positions (O4, fixes F5, core-web-app)

> **Status (2026-08-26):** implemented and committed as `0460d2a1a`. Vitest
> fully green (208 files / 2268 tests), biome clean, tsc delta clean (zero
> errors in touched/consumer files). Steady-state memory delta to be read off
> the heap profile together with Phase 4's.

`packColumns` writes `Float32Array`; `NodeGeometry.positions` (and
`orientations`) become `Float32Array`. Micron coordinates over a ~10⁴ µm span
keep ~10⁻³ µm resolution in f32; every consumer reads element-wise through
`positionAt`/`placementAt` and is dtype-agnostic. Update the f64 justification
comment in `types.ts`. Halves each retained geometry copy (113 → 56 MB per
population) and the transfer.

Touched: `worker/nodes-h5.ts:426`, `circuit-nodes/types.ts`; test fixtures that
construct `Float64Array` (`populations-placement.test.tsx`,
`large-circuit-preview-*.test.tsx`).

## Phase 3 — AO off the first paint (O3, fixes F6, morphoviewer)

> **Status (2026-08-26):** implemented and committed as `aa73132` on
> morphoviewer's `feat/240-somas-only-cell-picking` (not pushed — Pavlo
> pushes). `AmbientOcclusionComputation` is a resumable class; the painter
> drives it on idle callbacks (setTimeout slices on Safari/jsdom) and applies
> once via `setUV` + `paint()`; `delete()` cancels the pending slice. Jest
> 80/80 green, biome clean, lib build green. Tgz re-vendored into
> core-web-app (pack from `lib/`, NOT the repo root — the root pack nests
> `lib/dist/` and breaks the `morphoviewer/dist/...` deep imports);
> core-web-app vitest fully green against it. Found, not fixed (visual
> change): `Proximity.nextPoint` is written by cell index but read by point
> index, so each grid cell only ever offers its last-inserted soma as a
> neighbour — today's AO underweights density, and fixing it would change
> every frame's shading. In-browser check pending: cloud appears flat, then
> deepens once, ~a second later, with no first-paint stall.

`PainterCellInfos` builds the cloud with flat occlusion (`v = 0.5`, as the
array is already initialised), then computes AO asynchronously — chunked over
soma ranges on idle callbacks is enough (~1 s split into slices; a worker with
transferables is the fallback if slicing jitters) — and pushes the result
through the existing `setUV` path + `context.paint()`. Guard against the
painter being deleted mid-computation. No conflict with recolours: `recolor`
writes `u`, AO writes `v`, same array.

Touched: `morpho-viewer-somas-only/manager/painter-cell-infos.ts`,
`ambient-occlusion/ambient-occlusion.ts` (chunkable loop). Jest: cloud renders
before AO lands; AO applies once after.

## Phase 4 — Typed-array geometry API (O5, fixes F1, both repos)

> **Status (2026-08-26):** implemented. morphoviewer `6680e11` on
> `feat/240-somas-only-cell-picking` (not pushed — Pavlo pushes): the somas-only
> viewer takes `positions?: Float32Array` (wins over `cellInfos`; reference
> identity replaces the `sameGeometry` walk; `cellColors` is the only colour
> source on the path), `PainterCellInfos` packs the flat array straight
> (`packPositions`, bit-identical scan to the legacy loop, which stays for
> object hosts), and `SomaPicker` consumes the array as given. Jest 82/82,
> biome clean, lib build green; tgz re-vendored (packed from `lib/`).
> core-web-app `99d1d016e`: the preview concatenates placed geometries with
> `set()` into one `Float32Array`; the `cellInfos` memo and
> `SHARED_MORPHOLOGY_ID` are gone; F9a ride-along done — the debug download
> serialises in chunked Blob parts, no tuple objects, no single giant string.
> Vitest fully green (208 files / 2268 tests), biome clean, tsc delta clean.
> Exit measurement pending: steady-state heap profile before/after (together
> with Phase 2's), in-browser.

The big one. Viewer accepts flat positions alongside the legacy `cellInfos`:

- morphoviewer: new prop (e.g. `positions?: Float32Array`, xyz-interleaved;
  wins over `cellInfos` when both given). Manager: reference identity replaces
  the `sameGeometry` walk on this path. `PainterCellInfos` gains a
  positions-direct constructor path (stride copy + bbox scan, no objects).
  `SomaPicker` consumes the array directly instead of re-walking objects.
  `cellColors` remains the only colour source on this path.
- core-web-app `large-circuit-preview.tsx`: concatenate placed geometries with
  `set()` per population slice (straight copies after Phase 2); delete the
  `cellInfos` memo and `SHARED_MORPHOLOGY_ID`. `handleCellClick` index math
  unchanged.
- Ride-along (F9a): cap the debug "Download N nodes" button or stream it —
  today it `JSON.stringify`s 4.7 M tuples on the main thread.

Deletes ≈400 MB of per-soma objects and the last N-object GC load; prerequisite
for Phase 6's progressive placement.

**Exit criteria:** population switch and colour-by behaviour identical
(existing preview tests, adapted); steady-state heap profile before/after.

## Phase 5 — H5 residency (O6, fixes F2, core-web-app) — spike first

Goal: worker heap independent of file size, one worker per *file* (registry
keyed by `fileKey`, per-population sessions inside it — removes the same-file
double copy during placement too).

Investigation spike before any implementation:
1. h5wasm over WORKERFS/OPFS: stream the download to an OPFS file, open via
   `FileSystemSyncAccessHandle` in the worker so h5wasm reads pages on demand.
2. Fallback: emscripten lazy file over HTTP Range requests (signed URLs expire —
   re-sign on 403).

Spike deliverable: memory profile of approach 1 on the region file + a
one-page decision note appended here. Schedule when a target circuit's file
size actually threatens the tab; it's the only infrastructure change in the
plan.

## Phase 6 — Opportunistic

- **O7 progressive placement** (after Phase 4): show the subject when its
  geometry lands, append context populations without camera reset. Needs an
  append notion in the viewer's typed-array path.
- **O8 sparse spike glow** (when #159 goes region-scale, morphoviewer):
  ranged `bufferSubData` over cells whose glow changed, or shader-side decay
  from a per-cell last-spike-time attribute. Verify the problem is real first.
- **F9b**: palette opacity as a shader uniform instead of canvas
  `getImageData`/`putImageData` + texture re-upload per slider tick.

---

## Process constraints

- morphoviewer: never pushed by the agent — Pavlo pushes and opens the PR.
  Stage with `git add -u` (its untracked `CLAUDE.md` must never be committed).
- core-web-app: do not commit the vendor-sync artefacts (`package.json`,
  `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `vendor/`).
- `pnpm exec` is broken after the vendor sync (`ERR_PNPM_VERIFY_DEPS_BEFORE_RUN`);
  call `node_modules/.bin/vitest` / `node_modules/.bin/biome` directly. Lefthook
  fails the same way — run biome on staged files by hand, commit `--no-verify`.
- Soma size (radius) must not be changed.
- Behaviour-visible changes (palette order, fallback colours, legend) must stay
  pixel-identical; anything that alters them is flagged, not slipped in.

## Explicitly not doing

Selection-switch memo, adaptive-resolution controller, pick-buffer laziness,
placement bookkeeping, palette texture size — reviewed and sound. The numeric
column structured clone was benchmarked (129 ms) and acquitted; the string
materialisation around it was the cost.
