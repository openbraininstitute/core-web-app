// Side-effect-free constants for the GLTF brain-atlas viewer.
//
// Kept separate from `hooks.tsx` so consumers that only need a constant (e.g. the
// region banner's notification key) don't transitively import `@tolokoban/tgd`,
// which touches `document` at module scope and crashes server-side rendering.
export const ATLAS_3D_VIEWER_ERROR_MESSAGE_KEY = '3d-mesh-error';

/** Camera zoom that fills the small preview card; the full viewer keeps 1. */
export const COMPACT_CAMERA_ZOOM = 1.7;
