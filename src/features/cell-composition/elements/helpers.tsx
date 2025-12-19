import type { CalculatedCompositionPair } from '@/types/composition/calculation';
import { formatNumber } from '@/util/common';

export function getMetric(
  composition: CalculatedCompositionPair,
  densityOrCount: 'density' | 'count',
) {
  if (composition && densityOrCount === 'count') {
    return formatNumber(composition.count);
  }

  if (composition && densityOrCount === 'density') {
    return formatNumber(composition.density);
  }

  return null;
}

/**
 * Maps metrics to units in order to appear in the sidebar
 */
export const metricToUnit = {
  density: (
    <span>
      /mm<sup>3</sup>
    </span>
  ),
  count: <span>N</span>,
};
