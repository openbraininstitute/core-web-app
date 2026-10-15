'use client';

import { useEffect, useState } from 'react';

import { panelStyle } from '@/features/scan-config/components/color-by/contrast';
import { fmt as count } from '@/features/viewer-3d/chrome/debug-rows';

import { DETAIL_PIXELS, SEGMENT_BUDGET } from './engine/detail';

import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';
import type { Tier, TierChoice } from './engine/create-view';
import type { CircuitMorphologyView, DetailStats } from './types';

const BUDGETS = [SEGMENT_BUDGET, 1_000_000, 500_000, 200_000, 100_000];
const PIXELS = [1, DETAIL_PIXELS, 4, 8];
const TIERS: Record<Tier, string> = { webgpu: 'WebGPU', webgl: 'WebGL 2' };

/** What draws the view and why, and what the debug tools ask for. */
export interface RendererState {
  tier: Tier;
  reason: string | null;
  choice: TierChoice;
  onChoice: (choice: TierChoice) => void;
}

/**
 * For the debug tools: what draws the view, with WebGL 2 to choose instead of WebGPU; and what the view draws of
 * morphologies read a box at a time, with the budget and the pixels a level's tolerance may span to set lower.
 */
export function DetailReadout({
  viewer,
  theme,
  renderer,
}: {
  viewer: CircuitMorphologyView;
  theme: ViewerTheme;
  renderer: RendererState;
}) {
  const [detail, setDetail] = useState<DetailStats | null>(null);
  useEffect(() => viewer.onDetail(setDetail), [viewer]);
  const { tier, reason, choice, onChoice } = renderer;
  return (
    <div
      // Above the wheel's hint, which takes the bottom middle.
      className="pointer-events-auto absolute bottom-12 left-1/2 flex -translate-x-1/2 flex-col gap-1 rounded-md px-3 py-2 text-xs tabular-nums"
      style={panelStyle(theme)}
      data-testid="detail-readout"
    >
      {detail && (
        <>
          <div>
            {count(detail.drawn)} segments drawn of {count(detail.wanted)} wanted
            {detail.leftOut > 0 && `, ${count(detail.leftOut)} boxes left out`}
          </div>
          <div>
            Boxes by level:{' '}
            {detail.levels
              .map(({ toleranceUm, boxes }) => `${toleranceUm} µm × ${count(boxes)}`)
              .join(', ')}
          </div>
        </>
      )}
      <div className="flex gap-3">
        {detail && (
          <>
            <label className="flex items-center gap-1">
              Budget
              <select
                className="bg-transparent"
                value={detail.budget}
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
                value={detail.pixels}
                onChange={(e) => viewer.setDetailRules({ pixels: Number(e.target.value) })}
              >
                {PIXELS.map((value) => (
                  <option key={value} value={value}>
                    {value} px
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <label className="flex items-center gap-1">
          Renderer
          <select
            className="bg-transparent"
            value={choice}
            onChange={(e) => onChoice(e.target.value as TierChoice)}
          >
            <option value="auto">Auto</option>
            <option value="webgl">WebGL 2</option>
          </select>
        </label>
      </div>
      <div data-testid="renderer">
        Drawn with {TIERS[tier]}
        {reason && `: ${reason}`}
      </div>
    </div>
  );
}
