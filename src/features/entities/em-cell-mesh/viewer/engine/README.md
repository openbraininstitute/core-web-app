# EM cell mesh engine

Loads an EM cell mesh's GLB whole in the browser and draws it: a coarse stand-in as soon as there is one, the full mesh once it is on the GPU, and on each frame whichever of the two the view needs.

The in-depth reference: how each step works, why it is done that way, and what it was measured to cost. For the overview (what runs where, diagrams of a load and of the choice of mesh, and where to change what) see [../README.md](../README.md).

On staging (2026-10-01) there are 2,739 EM cell meshes, each with a Draco-compressed GLB labelled `cell_surface_mesh`, of 0.13 to 19 MB (median 3.8 MB, about 5M triangles). Each holds one primitive, positions only, in nanometres, quantised to 14 bits. "The largest mesh" is the 19 MB one, of 27.5M triangles; "the 8.7M mesh" is a 6 MB one. Timings are on an M4 Pro in Chromium unless they say otherwise.

Positions are in µm around the centre of the mesh's bounding box, which the view orbits.

## Why the whole mesh

The meshes also have level-of-detail sets made by Ultraliser (`lod_mesh_block` assets), which the viewer before this one streamed. A sample set is 106 MB in 308 files, against 8 MB in one file for a whole cell, and each file costs two round trips (entitycore, then S3). Drawn whole, the largest mesh cost 6 ms a frame on an M4 Pro, without occlusion, and zoomed in, culling skips the chunks out of view. So the viewer loads the GLB whole, and adds one coarse copy, the stand-in: the first picture, the view zoomed far out, and moving frames on a GPU too slow for the full mesh. A level of detail per chunk would add a level between the two, on a slow GPU at middle zoom; it waits for a machine that needs it.

## How it works

1. **Download.** The decode worker downloads the GLB (`downloadGlb` in `download.ts`). Its URL and headers come from `buildAssetDownloadRequest`. The URL is entitycore's, which holds the asset's id and doesn't change, unlike the presigned S3 URL it redirects to, so it keys the cache. The body is teed, as `fetchToFS` does for HDF5 files: one branch fills a buffer of the asset's size, with progress at most every 100 ms, and the other goes to Cache Storage (`em-cell-mesh-glb`, step 7). A GLB already in the cache is read from there the same way. An entry is untrusted on the way out: an interrupted write can leave a short body under the full `Content-Length` (Firefox does), so a body of the wrong length is deleted and downloaded afresh, and a write that fails, on the quota say, leaves no entry.

   A GLB's JSON chunk comes first, and holds the accessors' counts. So the header (`meshHeader` in `glb.ts`) is read from the first few kilobytes, before the rest has arrived, and the budget (step 2) decides there whether to go on: a mesh refused stops its download, or its read from the cache, at that point.

   While the bytes arrive, the decode worker fetches and compiles Draco's WASM, the stand-in worker meshoptimizer's (where the stand-in is to be made), and the page compiles the look's shaders (*Rendering*). All of that is then off the way to the first picture; a first shader compile can take hundreds of milliseconds on Windows.
2. **Budget.** `checkBudget` (`budget.ts`) judges the mesh from its header, before anything is decoded.
   - Past about 28M triangles, Draco can't decode it in the browser at all: its WASM memory can't grow past 2 GiB, and peaks at 73 to 76 bytes a triangle. The mesh is "Too large to view in the browser", with its GLB to download. The largest mesh today has 27.5M.
   - Otherwise the load's peak is the largest of its steps, each in bytes a triangle and a vertex as measured in Node on the largest and the 8.7M mesh. For a Draco GLB it is the decode: Draco's 72 bytes a triangle, a step of its growth, and the arrays it hands over. The frame buffers at fullscreen come on top, at about 80 bytes a device pixel. A peak past half the device's memory "may be too large for this device", and loads only on "Load anyway".
   - The device's memory is `navigator.deviceMemory`, which Chromium reports. Firefox and Safari don't, and there 8 GB is assumed on a desktop, 4 GB on a phone or a tablet. An iPad says it is a Mac, and gives itself away by its touch points.

   The share of the memory is a placeholder, until a measurement on an 8 GB Windows laptop.
3. **Decode.** `decodeGlb` (`decode.ts`), in the decode worker, decodes Draco with `draco3dgltf`'s decoder: the Node build of its glue, which runs in a browser once handed the WASM bytes. Draco is asked to skip the positions' dequantisation (`SkipAttributeTransform`), and they are read as the integers of Draco's grid, as `Uint16`, the grid's origin and step coming from its `AttributeQuantizationTransform`. In Node that decodes about a third faster (843 against 1,238 ms) and halves the positions, and every later step works on the grid. The bounding box comes from the accessors' bounds, so recentring needs no pass over the data. Positions on a grid finer than 16 bits, and those of a plain GLB, which contributors may upload, are read as floats, recentred and scaled from nm to µm.

   Draco's WASM memory never shrinks: on the largest mesh it peaks at 1,881 MB, 72 bytes a triangle. So the worker hands the mesh over and is terminated, which is the only way to give the memory back (step 6).
4. **Stand-in.** The stand-in worker makes a coarse copy of the mesh of at most 3M triangles (`STAND_IN_TRIANGLES` in `stand-in.ts`; the Debug menu offers 1.5M, 3M, 5M and 8M). On Draco's grid it is the mesh clustered (`cluster.ts`): the grid cut into cubes of any number of steps, every vertex in a cube moved to their mean, and the triangles left with their corners in three cubes kept, once each, with their winding. The error is the farthest a vertex moved.

   The cubes are sized from the surface's area, read from every 16th triangle. Clustering leaves 2.2 to 2.6 triangles a cube face on the staging meshes, so cubes of `sqrt(2.6 × area / budget)` keep within the budget in one pass. Where they leave too many, as cubes near the thickness of what they cluster do, the mesh is clustered again on cubes larger by the square root of the excess. On the largest mesh, the 3M stand-in is clustered on cubes of 0.31 µm: 2.82M triangles within 0.41 µm, made in 1 s.

   That is what meshoptimizer's sloppy simplifier does, on a grid as fine as asked: the simplifier's grid has at most 1,024 cells across the mesh's longest side, so its error could not go below 0.9 to 1.6 µm on these meshes, and it made fewer triangles than asked for. It still makes the stand-in of a mesh that is not on a 16-bit grid (`sloppy` in `stand-in.ts`), at about 43 bytes a triangle of WASM memory more.

   A mesh with no more triangles than the stand-in may have is its own stand-in, whole, with no error: nothing more is built or uploaded.

   Clustering loses what is thinner than a cube, rather than moving it. Zoomed four times in from the overview, the 3M stand-in leaves 18.5 % of the largest mesh's surface pixels empty, mostly thin axons and spine necks, which is why it stands in only far under a pixel (step 9). The stand-in is packed like the full mesh (step 5), so that one material draws both.
5. **Build.** The build worker packs the full mesh for the GPU (`packMesh` in `chunks.ts`), as the stand-in worker packs the stand-in.
   - *Normals.* Each vertex's normal is the sum of its triangles', weighted by their areas, before the split, so that the copies of a vertex on a border between chunks get the same one and no seam shows (`vertexNormals` in `viewer-3d/engine/normals.ts`).
   - *Flat triangles* are left out, with the vertices only they use: on Draco's grid, 15 to 22 % of a mesh's triangles have no area, and draw nothing.
   - *Chunks.* The triangles are split by their centroids' Morton codes, at the octree plane of the highest bit where they differ, until each chunk is within 131,072 triangles and 65,535 vertices. The chunks come out compact, so three culls those out of view, and a frame zoomed in costs less. Each chunk has vertices of its own, those on its borders duplicated (about 1.5 % of them on the largest mesh, in 381 chunks), so that its indices fit 16 bits. Index 65,535 is a primitive restart in WebGL 2, and a triangle that used it would disappear. The indices are the mesh's largest array, and 16 bits halve them.
   - *Vertices of 12 bytes.* The position is four 16-bit grid values and the normal four 8-bit ones, the fourth of each unused: Direct3D 11, which Chrome on Windows draws through, has no three-component 16-bit format, and ANGLE on Metal converts any vertex stride that isn't a multiple of 4. Either would convert the mesh as it goes up. An 8-bit normal is within half a degree, and as a normalised attribute of four it feeds `normal` with no decode in the shader. Float normals and positions would take 24 bytes.
   - *One grid.* Every chunk's positions are on one grid, so that a duplicated vertex has the same value in every chunk: rounded per chunk, the two copies could differ, and the border would sparkle close up. It is Draco's grid, where every chunk then has the same origin. Float positions get a grid whose step lets no chunk span more than 16 bits; where the whole mesh doesn't fit 16 bits on it, each chunk has an origin of its own on it. A chunk's matrix carries the grid's origin and step to µm, one scale for all three axes, so that the normals need no other matrix. It is set once, as three would otherwise compose it every frame for each of hundreds of chunks.

   On the GPU the largest mesh takes 293 MB.
6. **One worker, one tab at a time.** Each step's worker hands its arrays to the next through the page, transferred rather than copied, and is terminated once done (`load.ts`). The peak is then the decode's, about 2.4 GB measured on the largest mesh, never two workers' at once. The first version ran the stand-in and the full build side by side after the decode, which would have peaked at about 5 GB. The decode, the stand-in and the build hold a Web Lock (`em-mesh-decode`) between them, so that two tabs don't reach their peaks together. A view not seen yet (`SceneViewer.seen`: a tab opened in the background, or the card scrolled past) downloads and reads its caches, but makes nothing until it is.

   A worker that dies, out of memory say, fails the step it was on rather than leave it hanging: Comlink never settles a call to a dead worker. Before the stand-in, that is an error; after it, the stand-in stays on show, and the status says that full detail could not be loaded.
7. **Caches.** Three Cache Storage buckets, each kept for 30 days and to 500 MiB, the least recently opened going first past that (`asset-cache.ts`). The 30 days are safe, as a replaced mesh gets a new asset id. The browser may still drop a bucket (Safari after a week without a visit): it is only a cache.
   - `em-cell-mesh-glb` holds the GLB as downloaded (step 1). It saves the download, about 2.5 s on the largest mesh.
   - `em-cell-mesh-stand-in` holds the stand-in as packed, a JSON header then the arrays (`stand-in-cache.ts`): about 11 bytes a triangle, 32 MB for the largest mesh at 3M. It is read as the load starts, and on a hit the stand-in is drawn at once, and the stand-in worker is never started. Each size has an entry of its own.
   - `em-cell-mesh-full` holds the full mesh as packed, its arrays compressed with meshoptimizer's codecs (`full-cache.ts`): a quarter of the size, 86 MiB for the largest mesh, decoded in a fifth of a second. A built mesh's chunks go to the full-cache worker as they go up to the GPU, once three is done with their arrays. The worker encodes each as it comes, stores them all after the last, and is terminated. The cache is asked while the GLB downloads: on a hit the download stops, and nothing is decoded or built. A stand-in of a size not cached yet is clustered from the full mesh's chunks (`unpackMesh`): on Draco's grid every chunk has the same origin, so the chunks joined are the mesh again, the vertices on their borders once in each. A mesh refused at its header, or whose download fails, offline say, loads from it all the same.

   A key is the entitycore download URL with, for the meshes, the version of the pipeline that made them (`STAND_IN_VERSION`, `FULL_VERSION`). The version changes with anything that would make them come out differently, and an entry of another version is a miss.
8. **Upload.** `EmMeshViewer.setStandIn` draws the stand-in at once, and frames the view on the first. `setFull` uploads the full mesh over the next frames (`uploadSome`). Chunks go up for 12 ms of a frame while the view is still and 4 ms while it moves, at least one a frame, whether or not the frame is drawn. On the largest mesh its 381 chunks go up in 130 ms.

   Uploading a buffer is not enough: ANGLE does its per-draw work (vertex conversions, storage made lazily) on a chunk's first draw, and that would all land on the first frame of the full mesh. So each chunk is drawn once as it goes up, writing no pixel, into a target of one pixel of the formats the scene is drawn into (`SceneViewer.drawUnseen`). The full mesh is drawn only once all of it is up, so that the stand-in and part of the full mesh never show together. Its bounds then join the stand-in's, which fall short by up to the stand-in's error.

   Once a chunk is up its arrays are let go of (`BufferAttribute.onUpload`), and three draws from the GPU's copy. The stand-in's are kept, for a lost context (step 12).
9. **Which mesh.** Before every frame `MeshChooser` (`mesh-choice.ts`) picks the stand-in or the full mesh. The stand-in is drawn while the full mesh is not all up, where the stand-in is the whole mesh, and while the view moves on a GPU too slow for the full mesh (step 10). The Debug menu can force either. Otherwise the choice is by the stand-in's error on screen, in device pixels, the canvas's own: the error in µm times the pixel ratio, over the µm a CSS pixel spans, which in the orthographic view is the scale bar's figure. In perspective that is taken at the point of the mesh's bounds nearest the camera, where the error looks largest. The full mesh comes in past 0.1 px and goes under 0.06 px, with no flicker in between.

   The thresholds are far under a pixel because of what clustering loses (step 4). They began at 1.2 and 0.8 px, for a stand-in that would only move the surface, and came down as the stand-in turned out to drop the thinnest fibres. At a pixel ratio of 1 the dendrites of every stand-in size looked thinner than the full mesh's at overview zoom, at 0.12 to 0.54 px, their spines lost, and zoomed further out the largest mesh's 3M stand-in still looked thinner at 0.13 px. At overview zoom the full mesh is drawn at either pixel ratio. At a pixel ratio of 1, the largest mesh's stand-in comes back at about an eighth of the overview's zoom.
10. **Frame cost.** A frame is timed on the GPU (`gpu-timer.ts`): timing `render()` would measure only the submission. Chrome and Edge on desktop have `EXT_disjoint_timer_query_webgl2`. Elsewhere a fence after the frame is polled every 2 ms, from the frame's start until the GPU is done with it, which counts the submission and the polling too, and errs on the slow side. A result not in after a second counts as a second, as the slowest GPUs are what the measurement is for. One frame is timed at a time.

    The full mesh's cost (`FrameCost`) is the median of the last three full frames timed. A GPU that has been idle draws its first frames slowly: the M4 Pro drew the largest mesh in 13 to 31 ms the first frame after a pause, and in 8 ms from the third on. So a cold full frame, the first after a pause, after frames of the stand-in or after a change, counts at half. The two full frames after an upload or a resize go untimed, and after either, while nothing moves, the viewer draws the frames it takes to time one, so that the cost is known before the first drag. Moving frames are timed from the third after a pause, or after the page was hidden, and only where the frame before drew the same mesh, cut down the same way.

    While the view moves, the stand-in is drawn where a full frame costs more than 28 ms (`standInMs`), or where two moving frames of the full mesh in a row did, as zooming out from a cheap view makes them dearer (`MovingCost`). The second holds until the view stops; one dear frame alone may be the GPU waking up.
11. **Moving frames.** Pixels cost a moving frame more than triangles do. On the M4 Pro a frame costs about 0.23 ms per million triangles and 0.4 ms per million device pixels, and the occlusion adds about 0.1 ms per million pixels. An Intel integrated GPU has a fraction of that bandwidth, and writes the multisampled half floats out to shared memory, where the M4 keeps them on chip. So a moving frame over the budget, 18 ms (`DEFAULT_MOTION`), is cut down a step (`MotionQuality`, on the median of three). The occlusion is left out first, then half the pixels a step, to 71, 50, 35 and 25 % of the resolution. Frames cut to fewer pixels, or set to draw without antialiasing, go through a second composer, made the first time one is, with the occlusion but no bloom, and are scaled up onto the canvas.

    A step up brings the occlusion back or doubles the pixels. So it is taken where twice the cost, or what the step above cost within the last 5 s, keeps within 80 % of the budget. Stepping up that warily, a fast GPU might never bring the occlusion back, so moving frames go back to the top as soon as the view stops, where a full frame keeps within 80 %. The still frame is drawn in full. The Debug menu sets each part, and Auto steps only through what it leaves.

    Measured: on a software GPU (SwiftShader, timed by a fence) moving frames settle at 25 %, at 4 to 9 frames a second. On the M4 Pro every drag draws the full mesh with the occlusion at full resolution, 119 frames a second at 7.7 ms.

    OrbitControls damps a glide by the frame, which on a slow GPU drew a flick out over seconds of moving frames: 12.7 s at 15 frames a second. `SceneViewer` damps it by time instead, and ends it once what is left would move the view by under 2 CSS pixels: 0.76 s from release to the full mesh at 15 frames a second. A zoom, which OrbitControls applies in its own wheel handler, counts as moving, for 200 ms after each wheel notch. The morphology viewer shares both.
12. **Lost context.** The GPU can take the WebGL context, with all that was uploaded. three uploads the stand-in again from the arrays it keeps, but the full mesh's are gone: it is dropped, and once the context is back and the page on show, it is loaded again, from its cache in 0.56 s on the largest mesh. Lost a second time, the same mesh's full detail is let go of until asked ("Load it"). A context not given back within 5 s has the view say to reload the page.

## Rendering

Every frame is drawn through the composer (`composeAlways`), into a 4× multisampled half-float target, and its output onto a canvas with neither antialiasing nor a depth buffer of its own. The canvas's own multisampling would cost about 32 bytes a device pixel for nothing. Where the GPU can't draw into half floats, the target is 8-bit. The viewer asks for the high-performance GPU, where there are two.

With the ambient occlusion on, the mesh is still drawn once a frame. GTAO reads the main pass's depth, resolved out of the multisampled target, and the normals rebuilt from it once a pixel (`DepthNormalsPass`), where GTAO would rebuild them for each of its samples. The occlusion then darkens the scene in the output pass, as it tone maps. On the largest mesh at 3.2M device pixels, a full frame with the occlusion costs 7.0 ms, against 21.2 ms with the occlusion's own pass, which draws the mesh a second time (the Debug menu's AO depth, to compare). The occlusion runs at half the resolution. The morphology viewer keeps the pass of its own, which its displaced surface needs.

The looks are the morphology viewer's, built for a surface without vertex colours, neurite types or radii (`createLooks` with no attributes). Those that draw in the neurite colours draw the mesh in a plain colour of their own for each theme, none has bumps or a width floor, and Fluorescence, which colours by neurite type, isn't offered. As the chunks' positions are grid values that their matrices scale to µm, the toon outline is pushed out by pixels at the model's scale, and the gold leaf's flakes sit in world space.

The opening look's shaders compile while the mesh downloads (`EmMeshViewer.prepare`, which calls `SceneViewer.warmUp`). They are compiled for the composer's target, as tone mapping and the output colour space differ between it and the canvas, and then a placeholder is drawn once, as Metal builds its pipelines on the first draw.

On the GPU the largest mesh takes 293 MB and its 3M stand-in 32 MB. The frame buffers come on top, at about 80 bytes a device pixel: the Debug menu adds them up.

## Timings

All on the M4 Pro, 2026-10-02.

A first visit with the GLB at hand rather than downloaded, on a canvas of 3140 × 1476, draws the stand-in after 3.06 s and the full mesh after 4.60 s on the largest mesh, and after 1.25 s and 1.72 s on the 8.7M mesh. Downloaded from staging in Chrome, the GLB took 3.1 s for the largest mesh and 1.1 s for the 8.7M one, and Draco decoded them in 1.9 s and 0.6 s, its memory peaking at 1,881 MB and 669 MB. With the full mesh cached, a stand-in size not cached yet has the full mesh drawn after 1.61 to 1.69 s on the largest mesh and 0.83 s on the 8.7M one.

The stand-in at each size, on the largest mesh, on the same canvas. "Missing" is the share of the full mesh's surface pixels it leaves empty, zoomed four times in from the overview:

| Stand-in | Triangles | Error | Missing | Made in | On the GPU | Moving frame, with occlusion |
| --- | --- | --- | --- | --- | --- | --- |
| 1.5M | 1.46M | 0.58 µm | 21.8 % | 0.72 s | 16 MB | 2.7 to 4.2 ms |
| 3M | 2.82M | 0.41 µm | 18.5 % | 0.99 s | 32 MB | 2.9 to 3.6 ms |
| 5M | 4.53M | 0.31 µm | 13.9 % | 1.35 s | 51 MB | 3.4 to 4.0 ms |
| 8M | 6.86M | 0.27 µm | 9.6 % | 1.74 s | 79 MB | 3.7 to 4.7 ms |

On the 8.7M mesh the 1.5M, 3M and 5M stand-ins have 1.29M, 2.39M and 3.56M triangles, within 0.30, 0.22 and 0.11 µm, and leave 12.2, 8.0 and 6.2 % missing. The full mesh, moving, with the occlusion, costs 5.6 to 8.5 ms a frame on the M4 Pro: there the stand-in's triangles cost next to nothing.

Measured earlier, in headless Chromium at 3.2M device pixels with the occlusion on, with the stand-in of 1.34M triangles of the time: a visit with both caches warm drew the full mesh after 0.36 s on the largest mesh, 0.13 s on the 8.7M one. The full mesh came back after a lost context in 0.56 s, and its chunks went up in 130 ms.

The 3M stand-in and the 18 ms budget were set on a 4-core Intel MacBook Pro with integrated graphics, where the view turns smoothly on the stand-in.

## Limitations

- Past about 28M triangles a mesh can't be decoded in the browser; the largest today has 27.5M. Re-encoding the assets into chunks compressed one by one would lift that ceiling, and the decode's peak with it, and show any mesh within about a second. It is deferred: it needs a batch job over the meshes there are, and a hook on contribution.
- The stand-in loses what is thinner than its cubes, at any size (step 4). Finer cubes only where a cube holds surfaces facing apart, as across a thin fibre, would keep those for fewer triangles.
- Clustering's first cubes are sized for the most triangles a cube face leaves, so a stand-in comes out at 60 to 97 % of its budget. Aiming again in both directions would fill it, for one more pass.
- The stand-in cache keeps the arrays raw, about 11 bytes a triangle. Encoded as the full mesh's are, they would take about 3.5.
- The budget's share of the device's memory, and the 4 GB assumed on a phone or a tablet, are placeholders until measured on an 8 GB Windows laptop and an iPad.
- Where there are no timer queries (Firefox, Safari), a fence counts the submission and the polling too, so moving frames may read over the budget where Chrome's wouldn't.
- Safari sends a trackpad pinch as gesture events, which OrbitControls ignores.
- On an integrated GPU the still frame, the full mesh at full resolution with the occlusion, can take 100 ms or more. It is not spread over frames, so a gesture that starts just after it waits.
- A mesh with an OBJ and no GLB has no viewer. None on staging has one (2026-10-01).

## Considered, and left out

- **Two workers side by side after the decode,** the stand-in and the full build at once: about 5 GB at the peak on the largest mesh.
- **Splitting the decode across workers, or moving it to the GPU.** Each GLB is one Draco primitive, which Draco decodes in sequence.
- **WebGPU compute for the stand-in or the normals,** as the morphology mesher uses it. WebGL can't share buffers with WebGPU, so the mesh would go up twice, to save under a second.
- **Vertex-cache order per chunk** (`MeshoptEncoder.reorderMesh`). Triangles this small are likely limited by triangle setup rather than vertex shading. Adopt it only if timer queries at fixed views on an integrated GPU show a gain.

## Layout

```
load.ts               the pipeline on the page: workers, hand-over, caches, budget, the decode lock, abort
worker-apis.ts        what each worker exposes over Comlink
decode.worker.ts      worker entry: the download and Draco, terminated after
stand-in.worker.ts    worker entry: the stand-in, and meshoptimizer's memory for the Debug menu, terminated after
build.worker.ts       worker entry: the full mesh's normals and chunks, terminated after
full-cache.worker.ts  worker entry: the full mesh's cache, written as it goes up and read back, terminated after
download.ts           the GLB from its cache or the network, teed into the cache, its header checked as it arrives
asset-cache.ts        Cache Storage buckets kept in bounds: lifetime, total size, the least recently opened first
budget.ts             whether a mesh fits, from its header: Draco's ceiling, the device's memory
glb.ts                the GLB container: the JSON chunk and the counts it gives, plain accessors
decode.ts             a GLB into one mesh around its centre, on Draco's grid where it fits 16 bits
stand-in.ts           the stand-in: clustered on Draco's grid, or by meshoptimizer's sloppy simplifier
cluster.ts            vertex clustering on cubes of any number of grid steps, sized by the surface's area
chunks.ts             the split into chunks, 12-byte vertices on one grid, and the chunks joined again
stand-in-cache.ts     stand-ins between visits: the entry's format, a key per size and version
full-cache.ts         the full mesh between visits, compressed with meshoptimizer's codecs
types.ts              the meshes as the steps hand them on
em-mesh-viewer.ts     EmMeshViewer: the two meshes on the shared scene, the upload, the choice, timing, a lost context
mesh-choice.ts        which mesh a frame draws: the error on screen, what frames cost
motion-quality.ts     how moving frames are cut down: the occlusion, then the resolution
gpu-timer.ts          what a frame costs the GPU: a timer query, or a fence
```

The scene is shared with the morphology viewer, in `src/features/viewer-3d/engine/`. Its cameras, controls and looks are described in [the morphology engine's reference](../../../cell-morphology/morpho-viewer/engine/README.md#looks).

```
scene-viewer.ts        renderer, cameras, OrbitControls, render-on-demand loop, the composer and its passes,
                       moving frames' own pipeline, shader warm-up, draws unseen
depth-normals-pass.ts  the normals rebuilt from the scene's depth, once a pixel, for the occlusion
normals.ts             area-weighted vertex normals, and which triangles have no area
looks.ts               shading styles, and their variants for a surface without colours, types or radii
```

The viewer around the engine (hooks, chrome, help cards) is described in [../README.md](../README.md).

Tests: `src/__tests__/em-cell-mesh/`, with two Draco GLBs in `fixtures/`; the shared scene's in `src/__tests__/viewer-3d/`.
