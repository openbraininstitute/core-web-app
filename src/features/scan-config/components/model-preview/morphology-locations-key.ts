/**
 * Block-dictionary key holding morphology-location blocks in a simulation scan config.
 *
 * Its own module, importing nothing: exporting it from the hook closed an import cycle with
 * `circuit-preview`, which failed as a `ReferenceError` at render rather than at build.
 */
export const MORPHOLOGY_LOCATIONS_CONFIG_KEY = 'morphology_locations';
