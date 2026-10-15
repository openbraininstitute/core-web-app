'use client';

import { useEffect, useState } from 'react';

import { panelStyle } from '@/features/scan-config/components/color-by/contrast';
import { fmt as count } from '@/features/viewer-3d/chrome/debug-rows';

import { DETAIL_PIXELS, SEGMENT_BUDGET } from './engine/detail';

import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';
import type { CircuitMorphologyView, DetailStats } from './types';

const BUDGETS = [SEGMENT_BUDGET, 1_000_000, 500_000, 200_000, 100_000];
const PIXELS = [1, DETAIL_PIXELS, 4, 8];

/**
 * For the debug tools: what the view draws of morphologies read a box at a time, and the budget and the pixels a
 * level's tolerance may span, to set lower. Nothing where the morphologies are not read so.
 */
export function DetailReadout({
  viewer,
  theme,
}: {
  viewer: CircuitMorphologyView;
  theme: ViewerTheme;
}) {
  const [detail, setDetail] = useState<DetailStats | null>(null);
  useEffect(() => viewer.onDetail(setDetail), [viewer]);
  if (!detail) return null;
  const { budget, pixels, drawn, wanted, levels, leftOut } = detail;
  return (
    <div
      // Above the wheel's hint, which takes the bottom middle.
      className="pointer-events-auto absolute bottom-12 left-1/2 flex -translate-x-1/2 flex-col gap-1 rounded-md px-3 py-2 text-xs tabular-nums"
      style={panelStyle(theme)}
      data-testid="detail-readout"
    >
      <div>
        {count(drawn)} segments drawn of {count(wanted)} wanted
        {leftOut > 0 && `, ${count(leftOut)} boxes left out`}
      </div>
      <div>
        Boxes by level:{' '}
        {levels.map(({ toleranceUm, boxes }) => `${toleranceUm} µm × ${count(boxes)}`).join(', ')}
      </div>
      <div className="flex gap-3">
        <label className="flex items-center gap-1">
          Budget
          <select
            className="bg-transparent"
            value={budget}
            onChange={(e) => viewer.setDetailRules({ budget: Number(e.target.value) })}
          >
            {BUDGETS.map((value) => (
              <option key={value} value={value}>
                {count(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Tolerance within
          <select
            className="bg-transparent"
            value={pixels}
            onChange={(e) => viewer.setDetailRules({ pixels: Number(e.target.value) })}
          >
            {PIXELS.map((value) => (
              <option key={value} value={value}>
                {value} px
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
