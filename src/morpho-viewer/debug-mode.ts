const MORPHO_VIEWER_DEBUG_KEY = '@openbraininstitute/morphoviewer:debug';

/**
 * Whether morphoviewer's debug mode is switched on for this browser.
 *
 * Its own module, away from `@/morpho-viewer`, for the same reason as
 * `tree-item-type`: that barrel imports the package, which reads WebGL2
 * constants and instantiates WASM at module-body time. A worker-side or
 * non-React caller has no business paying for a renderer to read a flag.
 */
export function isMorphoViewerDebugMode(): boolean {
  const item = globalThis.localStorage?.getItem(MORPHO_VIEWER_DEBUG_KEY);
  return !!item && item.length > 0;
}
