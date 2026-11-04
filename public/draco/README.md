# Draco decoder assets

Self-hosted copies of the files `@loaders.gl/draco` would otherwise download from
unpkg.com and gstatic.com when parsing Draco-compressed GLB meshes (brain atlas viewer).
Configured in `src/features/brain-atlas-viewer/brain-atlas-viewer-gltf/draco.ts`.

Copied from `@loaders.gl/draco/dist` at the version pinned through `@loaders.gl/core` (4.4.1):

- `draco-worker.js`
- `draco@4.4.1/dist/libs/draco_wasm_wrapper.js`
- `draco@4.4.1/dist/libs/draco_decoder.wasm`

The `draco@<version>/dist/libs` layout is what loaders.gl expects below its `CDN` option.
When bumping `@loaders.gl/core`, copy the files again and rename the versioned folder.
