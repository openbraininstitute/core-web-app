/**
 * The neuron ids a raster's y-axis covers.
 *
 * A SONATA node_id is a row index, so the floor is 0 whether or not cell 0
 * fired, and the top is the population's last cell. A cellCount below the
 * highest recorded id is ignored, so every spike stays on the axis.
 */
export function nodeIdAxisRange(
  recordedMax: number,
  cellCount?: number
): { min: number; max: number } {
  return { min: 0, max: Math.max((cellCount ?? 0) - 1, recordedMax) };
}
