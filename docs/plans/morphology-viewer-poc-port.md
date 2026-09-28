# Morphology viewer: port the in-browser mesher POC

Replace the cell-morphology 3D viewer (tgd skeleton, `src/components/MorphoViewer/`) with the
POC at `/Users/getta/dev/tmp/local-morph-meshing`. The POC builds a closed surface mesh from
the SWC in Web Workers and draws it with three.js. It comes with its looks, view controls,
help cards and stats, inside the platform's viewer UI. The POC's build-parameter panel does
not come across.

Planned 2026-09-28 on `claude/morphology-viewer-poc-3d5ec9` (base `main` @ 189618356).
Revised the same day (round 2): looks, help cards, stats, Comlink.

## Decisions

| # | Topic | Decision |
|---|---|---|
| 1 | Server GLB (#1955, morphoviewer#54) | Superseded. The browser-built mesh is the only mesh, and the `cell_surface_mesh` asset is no longer fetched. |
| 2 | Looks | All 15 POC looks, with the Look picker and its one-line hint. **Studio** is the default. Compare all looks is **not** ported. |
| 3 | Look controls | Ported: Ambient occlusion; Bumps with height, scale and smoothness; Type tint; Wireframe; Show mesh; Skeleton (off / original / processed); Spin. EM segmentation keeps switching bumps and AO on, as in the POC. |
| 4 | Backgrounds | Each look draws its own background. Dark mode picks its dark variant where there is one. Overlay chrome (scale bar, ramp, hints, Settings button) picks its contrast from the actual background, not from the switch. |
| 5 | GPU | WebGPU with CPU fallback: probe once, rebuild on the CPU on defects, and turn the GPU off for the session after a failure. No UI switch. The backend in use shows in Stats. |
| 6 | Camera | Opens **orthographic**. A **Perspective** switch changes it. The scale bar shows in orthographic only. |
| 7 | Thickness slider | Replaced by **Min. width** (the POC's width floor): 0–4 px, step 0.5, 0 = off, **default 1 px**. |
| 8 | Color by Distance | Kept. A worker post-pass gives each vertex the path distance of its nearest skeleton point of the same type. The ColorRamp stays. |
| 9 | Eye toggle (hide type) | **Rebuild** without that type (POC `includeTypes`). The previous mesh stays on screen with progress. Works in every look. |
| 10 | Skeleton while building | The traced skeleton draws as soon as the SWC is parsed. When the first mesh lands, the Skeleton select takes over (default off). |
| 11 | Colours vs look | Each look declares whether the neurite colours apply (`palette`, `tint` or `own`). Where they don't, the swatches, Reset colors and Color by are **disabled, with the reason**; the eye toggles stay live. Where the look has its own colour code, the ramp is swapped for the **look's key** (Fluorescence, Depth-coded). |
| 12 | Help cards | Every control gets a "?" card, built on the app's `Popover`/`Tooltip` molecules. The POC's texts are trimmed to the kept controls, and new texts cover the platform-only ones. |
| 13 | Stats | At the **bottom** of the panel: morphology summary + mesh build stats + backend. One component, so a later feature flag can wrap it. |
| 14 | Panel | Today's Settings panel, extended into **one scrolling list** with section headings. |
| 15 | Export | GLB, Draco GLB and STL, **lazy-loaded** on click. One component, so a later feature flag can wrap it. |
| 16 | Workers | **Comlink**, as in the app's other 4 workers. |
| 17 | three.js | Bump the app from ^0.159 to ^0.186 and re-check the single-neuron (bluenaas) viewer. |
| 18 | UI style (revised 2026-09-28) | The circuit viewer's chrome, not the old morphology viewer's panel: round buttons, pills, a settings popover, a colour key card and the vertical ruler. Supersedes rows 11–14 where they differ (see Chrome). The viewer is as tall as the circuit viewer's. |
| 19 | Look selection (2026-09-28) | The first row of the settings popover, not a pill in the top bar: "Look  Studio ›" opens the 15 looks with their descriptions beside the menu. Choosing one closes the list and keeps the settings open, so the switches a look turns on show. |

Unchanged platform behaviour: Ctrl + wheel zooms (plain wheel in fullscreen), with the
"Hold Ctrl + scroll to zoom" hint; double-click toggles fullscreen; the fullscreen button;
Dark mode; per-neurite colour pickers with eye toggles; Reset colors; the loading and error
states.

Not ported: the build parameters (smoothing, voxel, blends, tubes, simplify, untangle, auto
rebuild, GPU switch, Build button), file open / drop / sample, and Compare all looks.

## What is ported

| POC | Fate |
|---|---|
| `swc soma prepare mesher field refine untangle kin segments growable classify tubes clip hybrid gpu-slab` | As is (engine), with build params as constants |
| `pool.ts`, `mesher.worker.ts`, `protocol.ts` | Rewritten on Comlink (see Workers). Scheduling, cancellation and transfer helpers kept |
| `viewer.ts` | Ported, minus compare tiles. Adds the ortho camera, palette/distance colour writes, look capabilities, `dispose()` and events |
| `looks.ts` | Ported whole. Each `Look` gains `colors: 'palette' \| 'tint' \| 'own'` and `legend?: 'fluorescence' \| 'depth'` |
| `framing.ts` | Ported, minus `tileLayout` |
| `help-text.ts` | Ported and trimmed. New keys for platform controls |
| `help.ts` | Rewritten as a React `HelpButton` (same behaviour, see Help cards) |
| `main.ts` stats (`renderMorphInfo`, `renderMeshStats`, `somaStemLines`) | Rewritten as React stats blocks, same lines, no `innerHTML` |
| `draco.ts`, `draco.worker.ts`, GLB/STL export | Lazy `export/` module; Draco worker on Comlink |
| `palette.ts` | Replaced by the platform palettes (light/dark constants) |
| `index.html`, `style.css`, the rest of `main.ts` | Not ported |
| README "How it works", Looks, Limitations | `engine/README.md` |

Build params (POC defaults): smoothing σ 1 µm, axon radius `heavy`, axon step 5 µm, voxel
10^-0.9 ≈ 0.126 µm, simplify 0.5 × voxel, blend 0.1, soma blend 1, min radius 1 × voxel,
mesh simplify 1 × voxel, tube aspect `DEFAULT_TUBE_ASPECT` (16), untangle
`UNTANGLE_VOXELS × voxel`, mesher `hybrid` (voxel fallback in the pool).

## Target layout

`src/features/entities/cell-morphology/morpho-viewer/` holds only 11 orphaned CSS modules
today, which nothing imports. They are deleted first. Then `src/components/MorphoViewer/` is
`git mv`'d there in kebab-case.

```
src/features/entities/cell-morphology/
  detail-view.tsx                   CellMorphologyViewer: SWC query + MorphoViewer
  morpho-viewer/
    morpho-viewer.tsx               shell (dynamic, ssr:false): engine, settings → viewer
    constants.ts                    palettes, build params, view defaults
    README.md                       overview: what runs where, Mermaid diagrams of a build
    use-viewer-settings.ts          settings state
    use-morphology-mesh.ts          SWC → skeleton → mesh lifecycle, GPU fallback, status
    use-path-distances.ts           distances of the shown layers, asked of worker 0 once each
    use-cell-morphology-swc.ts      (moved from src/state/morpho-viewer)
    use-signal.ts                   (moved)
    help/      help-button.tsx  help-text.ts  beside-row.ts
    chrome/    morpho-viewer-chrome.tsx  settings-menu.tsx  color-by-menu.tsx
               pill-option.tsx  neurites-key.tsx  stats-menu.tsx
               scalebar.tsx  status.tsx  export-menu.tsx
    engine/    (framework-free; see Engine API; README.md is the in-depth reference)
    export/    index.ts (runs the worker)  export.worker.ts  glb.ts  stl.ts  draco3dgltf.d.ts
src/features/scan-config/components/color-by/
  chrome-menu.tsx                   settings popover shell + rows, shared with the circuit viewer
  contrast.ts                       + panelStyle / mutedStyle, shared with the circuit chrome
```

Deleted: `src/components/MorphoViewer/`, `src/state/morpho-viewer/`, the orphan CSS,
`WaitingForSomaEnhancement` and the enhanced-soma comments, and the `ThicknessMode` and
`DendriteThickness` components. `@/components/common/Switch` and `Slider` stay: the panel
uses them.

## Chrome (as the circuit viewer's)

Revised in Phase 4: the controls follow `CircuitViewerChrome` rather than the old Settings
panel, and reuse its parts. The settings popover's shell and rows moved from
`viewer-controls-menu.tsx` into `color-by/chrome-menu.tsx` (`ChromeMenu`, `MenuRow`,
`MenuSlider`, `ViewerSwitch`, `SegmentedToggle`, `BackgroundToggle`), which both viewers now use;
the circuit menu renders the same DOM as before.

```
top-left    [⛶ Fullscreen] [⚙ Settings] [▦ Statistics] [⤓ Export mesh]
            [⌖ Re-centre view]
top-right   [Colour by  Section ▾] [▴]
            Neurites card: look key (Fluorescence, Depth-coded) · distance ramp ·
            ● Soma · ● Basal dendrite 👁 · ● Apical dendrite 👁 · ● Axon 👁 · reason · ↺ Reset colours
top-centre  status pill: "Building mesh… 40 %", or why the build failed
bottom-left morphoviewer's vertical ruler (orthographic, Scale bar on)
bottom      "Hold Ctrl + scroll to zoom" pill
```

- **Settings popover** (`ChromeMenu`): Look — the look (decision 19), Type tint (EM only), Ambient occlusion, Bumps
  (+ height, scale, smoothness while on); View — Mesh, Wireframe, Skeleton (Off / Traced /
  Processed, from the first mesh), Min. width, Spin, Perspective, Scale bar (off in
  perspective), Background (sun / moon).
- **Look** (first settings row): the 15 looks in a list beside the menu, each with its one-line
  description; the list carries `data-chrome-menu-keep-open`.
- **Statistics**: its own `ChromeMenu` popover (morphology + mesh lines), one component for a
  feature flag to wrap. Export will be another.
- **Neurites card**: swatches open antd's `ColorPicker`, as the circuit legend's; eyes hide a
  type. Where the look ignores the colours, Colour by is disabled with the reason in its tooltip,
  the swatches go hollow, and the card says why.
- **Theme**: pills and the card take `viewerTheme(isDark)` from `color-by/contrast.ts`, with
  `isDark` from the look's background gradient (chroma contrast), so SEM gets the dark panels in
  either Background; round buttons and popovers stay white, as in the circuit viewer.
- **Help cards**: the "?" after every row label stays. The card opens beside the row, placed by
  offsets measured from the row (a custom Radix anchor measured a detached trigger).

## Colours and looks

- **Colour source.** Every colour look reads the vertex `color` attribute, and EM's tint
  reads it too. So the palette, Section/Distance mode and Dark mode (which swaps palettes)
  rewrite that 8-bit attribute in one typed-array pass plus `needsUpdate`, and all looks get
  Distance for free. On a 4M-vertex mesh that is tens of ms, so colour-picker `input` events
  are coalesced to one write per animation frame. Fluorescence reads `swcType`, and
  Depth-coded computes its colour from depth; neither is affected.
- **Look capabilities** (added to `Look`):

  | `colors` | Looks | Colour controls |
  |---|---|---|
  | `palette` | Flat, Studio, Clay, Glossy, Pearl, Toon, Depth cue, Cutaway | enabled |
  | `tint` | EM segmentation | enabled while Type tint is on |
  | `own` | SEM, Golgi, Cajal, Gold leaf, Fluorescence, Depth-coded | disabled, with reason |

  `legend`: Fluorescence shows a key (green = soma and dendrites, red = axon); Depth-coded
  shows a near → far spectrum key. The ColorRamp shows only when Distance is on and the look
  applies colours. Disabled values are kept, so switching back restores them.
- **Backgrounds.** `backgroundCss(look, dark)` sits behind a transparent canvas, as in the
  POC, and `onTheme` runs for Cajal. The overlay theme (the `.darkMode` class that drives
  `--custom-color-*`) follows `backgroundIsDark` (reused from `color-by/contrast.ts`) on the
  look's bottom colour. So SEM in light mode still gets light text on its black field.

## Engine API (framework-free, owned by the React shell through a ref)

```ts
class Viewer {
  readonly looks: Look[]
  constructor(container: HTMLElement)
  dispose(): void
  setSkeleton(kind: 'original' | 'processed', data: SkeletonData | null, size?: Vec3): void
  showSkeleton(kind: 'original' | 'processed' | null): void
  setMesh(result: MeshResult): void
  showMesh(on: boolean): void
  setColors(p: Palette, mode: 'section' | 'distance', distances?: DistanceData): void
  setHiddenTypes(types: number[]): void     // skeleton lines only; the mesh is rebuilt
  setLook(id: string): Look                 // returns bumps/ao the page should switch on
  setAO(on: boolean): void; setBumps(p: BumpParams): void; setTypeTint(on: boolean): void
  setWireframe(on: boolean): void; setSpin(on: boolean): void; setMinWidth(px: number): void
  setDark(dark: boolean): void
  setProjection(p: 'orthographic' | 'perspective'): void
  resetView(): void
  onPixelScaleChange(cb: (µmPerCssPx: number | null) => void): () => void  // null in perspective
  onWheelWithoutCtrl(cb: () => void): () => void
}
```

- **Projection.** A `PerspectiveCamera` and an `OrthographicCamera`, swapped as
  `controls.object`. The ortho camera sits where the perspective one would, and the switch
  keeps target, orientation and the apparent size at the target (ortho half-height =
  d · tan(fov/2)). Everything the POC ties to the camera has to hold in both projections:
  - Depth cue fog ranges and the Cutaway plane follow the orbit distance, so they work if
    the ortho camera keeps that distance.
  - Depth-coded's `depthSpan` needs the same.
  - GTAO is built for one camera: swap `gtao.camera` and rebuild its `PERSPECTIVE_CAMERA`
    define.
  - The toon outline and width floor use clip w, which is 1 in ortho.

  `resetView` fits the soma-centred skeleton (`fitDistance`, fill 0.92) in either projection.
- **Scale bar.** Orthographic only. µm per CSS px = (top − bottom) / (zoom · clientHeight),
  emitted on controls change and resize. The existing `scalebar/` component paints it with
  `computeScalebarAttributes` (deep import from
  `@openbraininstitute/morphoviewer/dist/scalebar`, like `shared/3d-viewer.ts`) at 256 px.
  Today's ruler is 2× off (known main bug), so its numbers will change.
- **Wheel.** A capture-phase `wheel` listener on the container stops propagation to
  OrbitControls when `!ctrlKey` and not fullscreen, and fires `onWheelWithoutCtrl`. With no
  `preventDefault` the page scrolls, and a pinch (ctrl+wheel) still zooms.
- **Render loop.** The POC's render-on-change loop, which Spin keeps active while on.
  `dispose()` stops `setAnimationLoop`, disposes geometries, materials, textures, the
  composer and the environment, then `renderer.dispose()` + `forceContextLoss()`.

## Workers (Comlink)

- `mesher.worker.ts` does `Comlink.expose(api)` with `api = { load, plan, probeGpu, slab,
  merge, hybridPlan, hybridBatch, hybridPatch, hybridMerge, distances }`.
  - Each method goes through `serial()`, the POC's promise chain. The WASM simplifier loads
    asynchronously and GPU slabs await, and worker 0 can get a new `load` while stale slabs
    are still in flight.
  - Results return as `Comlink.transfer(result, resultTransfer(result))`.
- `pool.ts` keeps its scheduling (queue drain, big-patch finishing, supersede flag, voxel
  fallback).
  - `ask` / `settle` and the request/response unions go away, replaced by
    `Comlink.wrap<MesherApi>(worker)` per worker.
  - Jobs go in as `Comlink.transfer(job, jobTransfer(job))`.
  - `protocol.ts` shrinks to shared types, transfer helpers and constants.
- **Errors.** Comlink rethrows a plain `Error`, keeping `name` and `message`. So
  `GpuError` sets `name = 'GpuError'`, and the pool tests `isGpuError(e)` instead of
  `instanceof`.
- **Dead worker.** Comlink never settles calls to a worker that died, for example out of
  memory on a projection neuron. Each worker gets an `error` listener that rejects a
  per-worker `dead` promise, and every call is `Promise.race([call, dead])`, so the build
  fails into the error path instead of hanging.
- **Lifecycle.** The pool is created on mount (POC `defaultPoolSize()`, ≤ 12 workers).
  `dispose()` calls `proxy[Comlink.releaseProxy]()` and `terminate()` on each worker, the
  pattern in `nodes-worker-manager.ts`.
- **Draco.** The export module spawns one Comlink worker (`encode(mesh)`) per export and
  terminates it after.

## Build orchestration (`use-morphology-mesh.ts`)

1. The SWC text comes from the existing react-query download (unchanged key).
2. `load(text)` returns the summary and the original skeleton. `setSkeleton('original', …)`
   frames the camera; the neurite rows and Stats › Morphology fill from the summary.
3. GPU probe, cached per session. Then `build(params, { backend, mesher: 'hybrid',
   onProgress, onPlanned })`, where `onPlanned` feeds the processed skeleton. A GPU result
   with `defects > 0`, or a `GpuError`, turns the GPU off for the session and rebuilds on
   the CPU. The reason goes to Stats.
4. First mesh: `setMesh`, Stats › Mesh fills, and the skeleton goes back to the select's
   value.
5. Eye toggles: `includeTypes` = present types − hidden (soma always in). Debounce 350 ms,
   and `build` supersedes a running build. The old mesh stays, with a top-centre progress pill
   ("Building mesh… 40 %").
6. Distance: the first time for a given mesh, `distances()` on worker 0 computes node path
   distances once, then the nearest same-type segment per vertex via a `segments.ts` cell
   list. The result is cached on the mesh; the skeletons use the node distances. Match the
   ramp and `maxDendriteLength` to morphoviewer's (`painters/morphology/textures`).
7. Errors: a parse failure shows the error state. If the build fails on the CPU too, the
   skeleton stays on with a notice that the surface could not be built. `logError` logs both.

## Help cards

`HelpButton` ports `help.ts` behaviour onto the app's molecules:
- a hover peek (250 ms open, 120 ms close) and keyboard focus;
- a click to pin, closed by Escape or a click elsewhere;
- `aria-expanded`, `aria-describedby`;
- the card opens to the right of the panel, and Radix handles collision.

Popover and Tooltip already portal into the fullscreen element (`useFullscreenPortalTarget`),
so the viewer root sits in `FullscreenPortalScope`.

The card shows the title, the text, the effects list (Higher / Lower, On / Off, per option),
and the "Needs a rebuild of the mesh" / "Changes the view only, at once" line. The POC's
`setHelpStatus` (used for GPU only) is dropped, since that line lives in Stats.

`help-text.ts`:
- **Kept:** look, type-tint, ao, bumps, bump-amp / scale / smooth, min-width (merged with
  widen), show-mesh, wireframe, skeleton, spin, dark, export, stats. The `types` text is
  reworded for the eye toggles.
- **Dropped:** every build-param key, compare, auto, gpu, and the sample line.
- **New:** neurite colours, reset-colors, color-by, perspective, reset-view, look-key. I'll
  draft them in the POC's voice for review.

Types check that every `HelpKey` the panel uses exists.

## Dependencies

- `three` and `@types/three` ^0.159 → ^0.186.
- Add `meshoptimizer` ^1.2.0 (WASM inlined in JS), plus `@gltf-transform/core` ^4.5,
  `@gltf-transform/extensions` ^4.5 and `draco3dgltf` ^1.5.7 (the last three in the lazy
  export chunk only).
- `comlink` is already a dependency.
- Vite-isms: `?worker` → `new Worker(new URL('./mesher.worker.ts', import.meta.url), { type:
  'module' })`, the app's existing pattern. `draco_encoder.wasm?url` →
  `new URL('draco3dgltf/draco_encoder.wasm', import.meta.url)`, which Turbopack resolves and
  emits as a hashed media asset. `import.meta.env` → removed.
- `next.config.ts`: `turbopack.resolveAlias.fs = { browser: './empty-module.ts' }`, for
  Draco's Node glue (`require("fs")`, only reached under Node). `path` needs no alias.
  `./empty-module.ts` doesn't exist today, although the `canvas` alias already points at it.
  Adding the file makes both aliases valid. Nothing in the client resolves `fs` today (the
  build would fail if it did), so the alias changes no existing code.

## Phases

0. **Spike: done 2026-09-28, go.** Results under [Phase 0 results](#phase-0-results).
1. **three bump: done 2026-09-28.** `three` and `@types/three` 0.159 → 0.186.
   - Type-check of all three.js consumers (scratch tsconfig): 10 → 9 errors. The one removed
     was the stale `@ts-expect-error` on the OrbitControls import in
     `bluenaas-single-cell/renderer.ts`; the bump answers its TODO. Nothing new.
   - Vitest: 2688 pass, 3 skipped. `next build` compiles.
   - The planned browser re-check was moot: the three.js single-neuron renderer
     (`components/neuron-viewer/index.tsx` → `bluenaas-single-cell/renderer.ts`) is never
     mounted. The live single-neuron viewers use morphoviewer (tgd). The only live three.js
     path is the synaptome item's `createBubblesInstanced`, whose mesh nothing draws (only its
     `uuid` is used). It was run under r186 in Node: it builds fine.
   - Removing the dead renderer is a separate task (chip "Remove dead three.js single-neuron
     renderer").
2. **Engine port + tests: done 2026-09-28.** The 15 mesher modules are in `engine/`, unchanged
   apart from `biome format`.
   - **Lint.** 42 error sites rewritten into plain equivalents (28 `noAssignInExpressions`,
     14 `noParameterAssign`), plus 7 in the tests. Biome now reports 0 errors. The remaining
     warnings are the POC's non-null assertions and 2 `console` calls.
   - **Workers on Comlink.**
     - `mesher-api.ts` holds the API as a factory with its own state and `serial()` queue;
       `mesher.worker.ts` only exposes it. The split lets the tests run the API in-process.
     - `pool.ts` keeps the POC's scheduling and gains an injectable worker factory and an
       idempotent `dispose()`.
     - A dead worker fails its in-flight calls **and every later call**. The POC only failed
       in-flight ones, so its voxel fallback could hang on the same dead worker.
     - `protocol.ts` lost the request/response unions, and `GpuError` has a `name`.
   - **Tests.** 146 POC tests ported, including `shade.test`, which the list above missed.
     5 new pool tests use in-process `MessageChannel` workers: build, supersede, GpuError
     across Comlink, dead worker, dispose. The dead-worker test times out without the guard.
     Full suite: 2839 pass. Engine type-check: 0 errors.
   - `engine/README.md` holds the POC's algorithm notes, with the view-control rows dropped.
   - Deferred:
     - Build-param constants move to Phase 4, where they are first used.
     - The in-browser check of the Comlink pool also moves to Phase 4, because a throwaway
       page would need an auth bypass in `proxy.ts`, and that was denied.
3. **Viewer + looks: done 2026-09-28.**
   - `viewer.ts` is the POC's minus compare and exports. It adds:
     - both cameras, and `setColors(palette, distances?)`;
     - `setHiddenTypes` (skeleton lines only);
     - `background()`, `currentProjection`, `currentPixelScale`, `mesh`, and the pixel-scale
       and wheel events;
     - a `dispose()` that frees everything and loses the context.
   - The environment map is made the first time a look reflects it. The looks' shared
     uniforms reset on each new viewer.
   - `looks.ts`:
     - each look declares `colors`, plus `legend` for Fluorescence and Depth-coded;
     - the custom shaders take `viewDir` from three's `isOrthographic`, instead of
       `normalize(-mv.xyz)`.
   - New `colors.ts`: the platform palette → linear bytes, plus the distance ramp as a
     257-entry table, matching morphoviewer's green→yellow→red, blended in sRGB. It writes the
     vertex colours, so every colour look (and EM's tint) gets Distance. This replaces the
     palette-uniform idea.
   - New `camera.ts`: the ortho/perspective equivalence, ortho fit, pixel scale, clip range
     and fog range. The ortho camera stays at the perspective distance, and `reach` stands in
     for the zoom in fog, Cutaway and Depth-coded. On a switch, GTAO gets the new camera and
     its `PERSPECTIVE_CAMERA` define.
   - Tests: 31 new or ported (looks with capability and `viewDir` checks, framing with
     `reach`, camera, colours). The engine total is 182. Lint 0 errors, tsc 0 errors.
   - **Verified in a real browser** through a scratch Vite harness in the scratchpad, which
     imports the worktree's engine directly, so there are no app or auth changes:
     - the Comlink pool built the sample cell (285,248 triangles on the GPU, identical to the
       POC);
     - contact sheets of all 15 looks in both projections, and 3×/10× close-ups of Depth cue,
       Cutaway, Depth-coded, EM + AO, Fluorescence, Cajal and Toon, all alike across
       projections;
     - the distance ramp and the overlay with hidden types;
     - a plain wheel is gated and fires the hint; Ctrl+wheel zooms;
     - the ortho pixel scale matches projected distances exactly, at reset and after a
       6.3× wheel zoom;
     - `dispose()` removes the canvas and loses the context, with no console errors.
   - Found and fixed: a hidden (`display: none`) container resized to 1×1 and reported a
     bogus scale. Zero sizes are now ignored.
   - Known behaviour: switching to perspective keeps the size at the target, so a cell
     reaching towards the camera can overflow the frame. Reset view refits.
4. **React shell + move: done 2026-09-28.**
   - The old tree moved under `morpho-viewer/` (the orphan CSS, identical copies, deleted);
     `useCellMorphologySwc` decodes the SWC once, in the query's `select`.
   - First built as the old scrolling panel, then, on review, rebuilt as the circuit viewer's
     chrome (decision 18, section Chrome). The old panel, its CSS, ColorRamp, Scalebar,
     Warning and the enhanced-soma leftovers are gone; `common/Switch` and `Slider` are
     untouched.
   - `use-morphology-mesh.ts`: load → traced skeleton → GPU probe (per session) → hybrid build →
     CPU rebuild on defects or a GPU error; status and errors in the pill.
   - Viewer height `min(740px, 80vh)`, as the circuit viewer's.
   - Tests: 14 React tests with the engine mocked (skeleton first, errors, colours per look,
     look key, ruler in ortho only, Ctrl hint, eyes, help cards, every help key shown, stats,
     GPU fallback, dispose). Full suite 2884 pass; lint and types clean.
   - **Verified on localhost** (L5_TPC:B ch150801A1): GPU build 377 ms, closed surface; the
     ruler agrees with the 1,683 µm extent; Studio, Golgi (colours disabled with the reason) and
     Fluorescence (dark chrome, key); settings popover; help card beside its row; Statistics.
     Fullscreen could not be tried: the browser pane refuses it.
5. **Distance post-pass: done 2026-09-28.**
   - `engine/distances.ts`: node path distances along the tree, with every soma point at 0.
     Morphoviewer also walks a contour soma, so its maximum can differ by the soma's perimeter.
     A point takes the distance of the closest point on a segment of its own type. The lookup
     uses a `CellLists` grid padded by 1.5 × the 95th-percentile radius + 1 µm, so nearly every
     vertex finds its segment in its own cell. Two more rings are searched, then that type's
     segments one by one.
   - `distances()` on worker 0 builds the lookup once per load. The mesh arrays are copied to
     it, since the viewer keeps drawing them, and the results are transferred back.
   - `use-path-distances.ts` asks only while Colour by is Distance, and only for the layers
     not yet measured: traced skeleton, processed skeleton, mesh. Results are cached by layer
     object in WeakMaps, so a late answer never colours a newer layer. Until they arrive, a
     layer keeps its section colours.
   - The key's ramp shows 0 to the farthest node, as morphoviewer's `maxDendriteLength` did.
   - Sample cell (25,200 nodes, 128k vertices): lookup built in 10 ms, all vertices in 50 ms,
     every one of them settled in its own cell.
   - Also fixed: the settings trigger's Tooltip switched from uncontrolled to controlled (on
     `main` too). It is now controlled throughout.
   - Tests: 9 engine tests (sums in any file order, contour soma, a loop, the crossing,
     interpolation, soma and missing types at 0, the far fallback, skeleton midpoints), one
     through the Comlink pool and one React test (measured once per layer, ramp, back to
     Section).
   - **Verified on localhost** (ch150801A1): green at the soma to red at the apical tufts, 0 to
     1,423 µm. The mesh, the traced skeleton and the processed skeleton are all coloured, with
     no seams at the soma, and Section restores the palette.
6. **Hide by rebuild: done 2026-09-28.**
   - `use-morphology-mesh.ts` takes the hidden types. Loading and building are now two
     effects. The build meshes the visible neurite types plus the soma, keyed by that list, so
     an eye that ends where it started rebuilds nothing.
   - The first build starts at once. After that, an eye waits 350 ms for the next toggle. The
     pill shows "Building mesh… 0 %" at once and the old mesh stays until the new one is in. A
     newer toggle cancels the running build (`MeshPool.cancel()`, now public).
   - The processed skeleton is the same for every build, because the types left out only
     leave the mesh, so it is set once per load.
   - If a rebuild fails, the mesh is dropped and the skeleton, without the hidden types,
     stands in, with the error in the pill. Every type hidden on a cell without a soma leaves
     nothing to mesh, so no build runs.
   - Tests: 3 React (rebuild after the pause with the old mesh kept, quick toggles coalesced
     and a round trip skipped, a failed rebuild) and 1 pool (`cancel`).
   - **Verified on localhost** (ch150801A1): the pill at 20 ms, the build from 370 ms, the new
     mesh at 520 ms (GPU). Axon and basal dendrites hidden and shown again; Distance colours on
     a rebuilt mesh, with the ramp's maximum kept.
7. **Lazy export: done 2026-09-28.**
   - `chrome/export-menu.tsx`: `ExportMenu` is a chrome button after Statistics, one component
     for a flag to wrap. It lists GLB, Draco GLB and STL, disabled until the first mesh. The
     running row shows a spinner ("Compressing…" for Draco) and the others wait. Errors show in
     the menu and go to `logError`. The file is saved with `file-saver` as
     `<name>.glb / .draco.glb / .stl`.
   - `export/index.ts` is imported on the first click only. It holds three's GLTFExporter and
     STLExporter, and starts `draco.worker.ts` (Comlink, one worker per export, terminated
     after, with an error listener so a dead worker rejects). The worker brings glTF-Transform,
     Draco's glue and its WASM (`new URL('draco3dgltf/draco_encoder.wasm', import.meta.url)`).
   - Colours: the neurite palette of the current background, as linear floats (`typeRgb`, which
     `typeBytes` now derives from). The mesh on show is exported, so hidden types are left out.
   - `draco.ts` is the POC's; glTF-Transform's accessor type wants ArrayBuffer-backed arrays.
   - Tests: the POC's Draco suite (5), GLB and STL in jsdom (2), and 2 React tests (exporters
     imported only on click, file name, disabled until the mesh; a failed export). The four
     tests that mesh the sample cell (1.4–3.3 s alone) now allow `SAMPLE_CELL_TIMEOUT`, 30 s:
     with the Draco suite in the run, one crossed the 5 s default in the full suite.
   - `next build` passes. It emits `draco_encoder.<hash>.wasm`, and the Draco worker goes the
     way of the app's other `new Worker(new URL(…))` workers.
   - **Verified on localhost** (ch150801A1, save step stubbed so nothing was downloaded): GLB
     4.3 MB in 49 ms; Draco GLB 335 KB in 233 ms, 13× smaller; STL 7.2 MB (143,842
     triangles). The exporter chunk and the worker load only after the click.
8. **Help texts** (drafts for your review) and **verification**, then `/simplify` and
   `/code-review`.
   - Help texts checked against the code. Five changed:
     - colours: the swatches give way to the ramp, and the rebuild follows a pause;
     - Distance: the key gives the scale;
     - Mesh: needs a skeleton to show anything;
     - Skeleton: gains Off;
     - Morphology: the origin without a soma.
   - **Verified on localhost, 2026-09-28:**

     | Cell | Kind | Build (GPU) |
     |---|---|---|
     | ch150801A1 | pyramidal, apical | closed |
     | Pvalb-IRES-Cre;Ai14-176852.05.02.01 | Allen interneuron, 63 detached neurites, one dendrite type ("Dendrite") | 215 ms, closed |
     | MICrONS neuron 864691136330101226 | EM skeleton | 398 ms, closed |
     | AA0187 BBP Corrected | MouseLight projection neuron, 76 mm of cable | 489 ms, closed |
     | MOs2_and_friends_fde5b56a… | Synthesized: soma and dendrites | renders |

     - All 15 looks in orthographic; Depth cue, Cutaway, Depth-coded and Toon in perspective,
       with no ruler; Studio in the dark background, with its palette and panels.
     - Idle draws nothing with Spin off. After Spin, the damping coasts for about 2 s. In a
       hidden pane, where Chrome throttles the frames to 1 Hz, the coasting stretches out.
     - A client-side navigation away terminates the 12 workers and loses the WebGL context.
     - The cell's Mesh viewer tab mounts the same viewer, and it works.
   - **`/simplify`** (4 review agents), applied:
     - Popovers are dismissed by Radix, which takes a popover opened from inside a menu for
       inside it. `useChromeDismiss` (in `color-by/chrome-menu.tsx`, shared with the circuit
       viewer) adds only what Radix can't see: a press on a canvas and a fullscreen change.
       `data-chrome-menu-keep-open` and the second hook are gone.
     - The viewer repaints the overlays' colour buffers on a colour change. It rebuilds an
       overlay only on a new skeleton or a hidden type, and passes the positions through
       untouched when nothing is hidden.
     - `DistanceData.of(layer)` looks distances up by the object the viewer was given, so the
       slot clearing and the length checks are gone. `usePathDistances` asks for each layer
       once, even while a request is in flight, and gives the viewer a new value only when a
       measurement arrives.
     - The render loop stops once nothing moves and restarts on any change: idle, it runs no
       frame callbacks at all.
     - Progress re-renders only on a whole-percent change. The stats lines are built only
       while their menu is open. The SWC decode no longer runs every render.
     - Dead or duplicate code removed:
       - `MorphologyMeshState.mesh`, `Look.typeTint` (now derived from `colors: 'tint'`), and
         the help card's `'build'` line;
       - three unused `Viewer` members; `setLook` now returns `void`;
       - one `DEFAULT_LOOK` (`looks.ts`) and one `PALETTE_KEYS` (`colors.ts`);
       - `resetView` from `ViewerActions`.
     - Double-click fullscreen moved to the canvas host, so the chrome and help cards no longer
       stop the event.
     - A help card near the right edge opens on the left of its row, at the right distance.
   - **Second `/simplify`**, on everything but `engine/`, applied:
     - Export: all three formats are written in one worker (`export/export.worker.ts`). GLB goes
       through glTF-Transform, with or without Draco (`export/glb.ts`, one scene builder), and
       STL through a typed-array writer (`export/stl.ts`). three's exporters, and their seconds
       on the main thread and several copies of a large file, are gone. The menu's format rows
       carry their extensions, and the save runs outside the component.
     - `ChromePill` is folded into `ColorByMenu`, its only user. `pill-option.tsx` keeps
       `PillOption` and `focusChosen`.
     - Focus on opening: a menu focuses itself (shared `ChromeMenu`), and a list focuses its
       chosen option, so a "?" no longer takes the focus and brings up its card.
     - `besideRow` (help/) places both the help cards and the look list; `HelpRow` gives every
       settings row its help anchor.
     - `setColor` ignores a colour already set, which the picker sends while dragged past its
       edge. `resetColors` keeps an empty hidden-types array.
     - The Swatch uses `useChromeDismiss`, as antd closes the picker on other presses. One
       `Ramp` serves the distance scale and the look key.
     - `look` is always a `Look`, and `ViewerActions` is derived from the settings hook.
     - Fixed: a help card that opened after the pointer had left the "?"; the detail view's
       error state, which could not show.
   - Second `/simplify` skipped:
     - `meshExtent` from glTF-Transform accessor bounds (low).
     - Reading the palette through a ref in ExportMenu (the component now compiles).
     - The circuit-viewer items again: `SegmentedToggle` against `ModeToggle`, the synapse
       legend rows, `KeyBadge`, the tooltip props, and the circuit pills' dismiss copies.
   - `/simplify` findings skipped:
     - Moving `ChromePill`/`PillOption`, the legend toggle, `ContinuousScale` and `ChromeNotice`
       into shared components means changing circuit-viewer code outside this change.
     - The GPU/CPU policy stays in the hook rather than moving into `MeshPool`.
     - Normals stay Float32 rather than converting to Int16 in the worker.
     - `depthSpan` is not gated per look.
     - The morphoviewer scalebar prop keeps its type cast.
     - One vertex-colour helper was not worth it: the bundle boundaries would need a new module.
     - The stats `<Fragment key>`s stay: Biome wants keys in array literals.
   - **`/code-review`** (the port, the engine edits included; 11 findings), all fixed:
     - Only a `GpuError` turns the GPU off for the session; any other failure of a GPU build
       gets one try on the CPU and leaves the GPU on.
     - Export is held while the mesh is built again, which still showed the types just hidden,
       and says why there is nothing to export: still building, being built again, could not be
       built, every type hidden. The stats say when the build failed.
     - `useChromeDismiss` (shared) also closes a menu on a press that never reaches the
       document, which a React handler or tgd stopped, unless it lands in a popover. The old
       circuit menu did this with its capture listener.
     - The Skeleton toggle shows Traced while the traced skeleton stands in for the mesh.
     - The swatch keeps its button (and the keyboard focus) when its picker opens.
     - `besideRow` drops a card below its row where neither side has room (a phone), rather
       than letting the popper flip it with the other side's offsets.
     - A failed distance measurement shows in the key; choosing Distance again retries.
     - The Draco WASM fetch checks the response; a stale doc comment went; `panelStyle` and
       `mutedStyle` moved to `contrast.ts`, where the circuit chrome uses them too.
   - Not verified here: a file with no soma (unit tests only); Universal morphologies (same
     component, none found in the browser); fullscreen and double-click (the pane refuses
     them); Firefox and Safari (the CPU path); the export files in Blender (the Draco round
     trip is tested); the production runtime.

## Phase 0 results

The spike ran the POC's own pool, worker and Draco modules, copied unchanged except for the
two Vite imports. It ran from a throwaway page (`/spike-mesher`) on the sample cell with the
default build params, in the Claude browser pane (Chromium 152, 14 cores).

| Check | Turbopack dev | `next build` |
|---|---|---|
| 12 module workers from `new Worker(new URL(...))` | ✓ | ✓ worker chunks emitted |
| `meshoptimizer/simplifier` WASM in the worker | ✓ 2.3 M → 286 k triangles, 4 rounds | ✓ |
| `navigator.gpu` in the worker | ✓ adapter `apple metal-3` | n/a |
| Draco: lazy `import()` → worker → Node glue + WASM | ✓ 0.65 MB GLB in 338 ms, after the `fs` alias | ✓ `draco_encoder.<hash>.wasm` in `static/media` |
| Whole build | — | ✓ compiled in 20 s |

**Parity with the POC, run directly under Vite with the same worker count:**

| Build | POC | App bundle | Time in the app |
|---|---|---|---|
| CPU | 285,672 triangles, 142,838 vertices | identical | 651 ms |
| GPU | 285,248 triangles, 142,626 vertices | identical | 291 ms |

Both builds report 0 defects, 0 non-manifold edges and a closed surface.

**Not verified: the production runtime.** A local `next start` page can't hydrate, because
the client config needs deploy env values that CI injects, and reading the env files was
denied here. The build output looks right, so the first real prod run is the PR preview
deployment, or a local run with a filled `.env.production.local`.

Also found: the first compile error (before the alias) broke the page, although the Draco
import is lazy. Turbopack compiles lazy chunks eagerly, so a missing alias fails the whole
route.

Spike leftovers (uncommitted, deleted at the start of Phase 2): `src/spike-mesher/`,
`src/app/spike-mesher/`, `public/spike-mesher/`, the `'/spike-mesher*'` entry in `proxy.ts`,
and the `fs` alias pointing at `src/spike-mesher/empty.ts`. The 4 new dependencies in
`package.json` / `pnpm-lock.yaml` stay.

## Tests

- **Ported** into `src/__tests__/cell-morphology/mesher/`, each file with
  `// @vitest-environment node`: swc, soma, soma-field, prepare, mesher, hybrid, tubes,
  clip, refine, kin, untangle, framing (minus tiles), gpu-slab (CPU binning), draco and
  looks. `help.test` becomes a panel test (every key the panel renders has a text, and no
  text is orphaned). The POC suite is 172 tests in ~10 s wall. The 1.1 MB sample
  `18864_05088.swc` goes to `src/__tests__/cell-morphology/fixtures/`.
- **New, engine:**
  - distance post-pass: a vertex beside node n gets n's distance, and the same-type
    restriction holds at a crossing;
  - colour writes per mode and palette;
  - look capability table vs what each material reads;
  - the projection switch keeps the apparent size;
  - ortho pixel scale;
  - a dead worker rejects the build instead of hanging.
- **New, React** (engine mocked):
  - colour rows are disabled with a reason for `own` looks, and for EM until Type tint;
  - the look key vs the ramp;
  - the scale bar shows in ortho only;
  - an eye toggle requests `includeTypes` and keeps the old mesh;
  - the Ctrl-wheel hint;
  - help cards open, pin and close on Escape;
  - export is imported only on click;
  - Stats is at the bottom.

## Browser verification

On localhost (needs your login), with a pyramidal cell with an apical dendrite, an
interneuron, a large projection neuron, a file with no soma, and a Universal and a Synthesized
morphology:

- Skeleton first, then the mesh; the skeleton and the mesh overlay exactly.
- Each of the 15 looks, in ortho and perspective and in light and dark: background, overlay
  contrast, colour-row state, look key. Fog, Cutaway, Depth-coded, AO, bloom and toon
  outline in ortho.
- Ortho ↔ perspective framing. The scale bar is ortho only and correct against a known
  extent.
- Ctrl-wheel hint, plain wheel in fullscreen, double-click fullscreen, and help cards in
  fullscreen.
- Colours (smooth while dragging the picker on the projection neuron), Reset colors, and
  the Distance ramp in a colour look and in EM with Type tint.
- Eye → rebuild with progress. Min. width 0 / 1 / 4 px. Wireframe, Mesh off, processed
  skeleton, Spin.
- Export: the three files open (three.js editor or Blender).
- Stats lines match the POC's for the sample cell.
- Workers terminated and WebGL context freed after navigating away. Idle = 0 frames with
  Spin off.
- Chrome (WebGPU), then Firefox and Safari (CPU path).

## Risks

1. **Camera-tied look features under ortho** (fog, Cutaway, Depth-coded range, GTAO). Each
   one needs checking, and GTAO needs its camera swapped.
2. **Production runtime not yet exercised** (see Phase 0 results). The bundling itself is
   verified. Draco under Turbopack is resolved by the `fs` alias.
3. **WebGPU on untested hardware** (only Apple/Metal so far). There are three fallbacks:
   defect check, shader-compile probe and session disable.
4. **Cost on low-end machines.** Up to 12 workers, projection neurons at 1–4 s CPU, and AO
   and bloom passes. The pool size is one constant.
5. ~~three bump regressions in the single-neuron viewer~~. Retired in Phase 1: that renderer
   is not mounted.
6. **Scale-bar numbers change 2×** vs today (the old ruler bug). Worth a line in the PR.
7. **Panel length.** About 30 rows scroll inside a 260–360 px viewer. Fullscreen is the
   comfortable way to explore.

## Out of scope / follow-ups

- Feature flag(s) for Export and Stats (`defineFlag`, `visible` in local/preview/staging),
  and maybe a CPU/GPU override. Each is a single component to wrap.
- Close draft #1955 and morphoviewer#54. That is outward-facing, so ask first.
- Remembering the chosen look and settings across visits.
- Caching built meshes per hidden-type set.
- Lazy-loading the post-processing addons and `RoomEnvironment` for bundle size.
- Other single-morphology surfaces (ME-model card, e-model exemplar, single-neuron
  simulation viewer) are unchanged.
