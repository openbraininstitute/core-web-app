'use client';

import {
  RiCpuLine,
  RiDashboard3Line,
  RiEyeOffLine,
  RiPieChart2Line,
  RiRulerLine,
} from '@remixicon/react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { SegmentedToggle } from '@/features/scan-config/components/color-by/chrome-menu';
import { panelStyle } from '@/features/scan-config/components/color-by/contrast';
import { DebugMenuShell, fmt, Lines } from '@/features/viewer-3d/chrome/debug-rows';
import { formatCompactNumber } from '@/utils/format';

import { DETAIL_PIXELS, SEGMENT_BUDGET } from '../engine/detail';
import { type CircuitDebugLoad, detailLines, loadLines, rendererLine } from './detail-lines';
import { HelpRow, ICON, SectionTitle, ToggleRow } from './menu-rows';

import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';
import type { CreatedView, Tier, TierChoice } from '../engine/create-view';
import type { CircuitMorphologyView, DetailStats } from '../types';

const BUDGETS: Record<Tier, number[]> = {
  webgl: [SEGMENT_BUDGET.webgl, 1_000_000, 500_000, 200_000, 100_000],
  // The finer levels beside every box's coarsest: 8M at the most, where 10M more beside HEX4-L4's coarsest (6.1M) take
  // about 490 MiB of segments' ends, of the 512 MiB binding the probe asks.
  webgpu: [8_000_000, SEGMENT_BUDGET.webgpu, 2_000_000],
};
const PIXELS = [1, DETAIL_PIXELS, 4, 8];

/** Told about every frame while the culling counts: only what shows the numbers listens. */
function useDetail(view: CircuitMorphologyView | undefined): DetailStats | null {
  const [detail, setDetail] = useState<DetailStats | null>(null);
  useEffect(() => view?.onDetail(setDetail), [view]);
  return detail;
}

function DetailRows({
  detail,
  view,
  tier,
}: {
  detail: DetailStats;
  view: CircuitMorphologyView;
  tier: Tier;
}) {
  const held = detail.floor === 0;
  return (
    <>
      <HelpRow
        title="Budget"
        topic="budget"
        icon={<RiPieChart2Line className={ICON} />}
        className="flex-wrap"
      >
        <SegmentedToggle<string>
          value={String(detail.budget)}
          onChange={(budget) => view.setDetailRules({ budget: Number(budget) })}
          options={BUDGETS[tier].map((value) => ({
            value: String(value),
            label: `At most ${fmt(value)} segments`,
            text: formatCompactNumber(value),
          }))}
        />
      </HelpRow>
      <HelpRow
        title="Tolerance within"
        topic="tolerance"
        icon={<RiRulerLine className={ICON} />}
        disabled={held}
        className="flex-wrap"
      >
        <SegmentedToggle<string>
          value={String(detail.pixels)}
          disabled={held}
          onChange={(pixels) => view.setDetailRules({ pixels: Number(pixels) })}
          options={PIXELS.map((value) => ({
            value: String(value),
            label: `A tolerance within ${value} device pixels`,
            text: `${value} px`,
          }))}
        />
      </HelpRow>
      {tier === 'webgpu' && (
        <ToggleRow
          title="Culling"
          topic="culling"
          icon={<RiEyeOffLine className={ICON} />}
          checked={detail.culling}
          onChange={(culling) => view.setDetailRules({ culling })}
        />
      )}
    </>
  );
}

interface CircuitDebugProps {
  /** Where the menu goes, among the chrome's controls. */
  target: HTMLElement;
  /** The view; null while another is made. */
  created: CreatedView | null;
  choice: TierChoice;
  onChoice: (choice: TierChoice) => void;
  cells: number;
  load: CircuitDebugLoad | undefined;
  theme: ViewerTheme;
}

function MenuBody({
  created,
  choice,
  onChoice,
  cells,
  load,
  readout,
  onReadout,
}: Pick<CircuitDebugProps, 'created' | 'choice' | 'onChoice' | 'cells' | 'load'> & {
  readout: boolean;
  onReadout: (readout: boolean) => void;
}) {
  const detail = useDetail(created?.view);
  return (
    <>
      <div className="flex select-text flex-col gap-3 p-3 text-neutral-700">
        <SectionTitle title="Drawn" topic="drawn" />
        <Lines lines={[rendererLine(created)]} />
        <SectionTitle title="Load" topic="load" />
        <Lines lines={loadLines(cells, load)} />
        {detail && created && (
          <>
            <SectionTitle title="Detail" topic="detail" />
            <Lines lines={detailLines(detail, created.tier)} />
          </>
        )}
      </div>
      <div className="flex flex-col border-t border-neutral-200 p-1 pb-2 text-neutral-700">
        <HelpRow
          title="Renderer"
          topic="renderer"
          icon={<RiCpuLine className={ICON} />}
          className="flex-wrap"
        >
          <SegmentedToggle<TierChoice>
            value={choice}
            onChange={onChoice}
            options={[
              { value: 'auto', label: 'Chosen by the browser', text: 'Auto' },
              { value: 'webgl', label: 'Always WebGL 2', text: 'WebGL 2' },
            ]}
          />
        </HelpRow>
        {detail && created && (
          <DetailRows detail={detail} view={created.view} tier={created.tier} />
        )}
        <ToggleRow
          title="Readout"
          topic="readout"
          icon={<RiDashboard3Line className={ICON} />}
          checked={readout}
          onChange={onReadout}
        />
      </div>
    </>
  );
}

/** The numbers over the view, as a drag on it closes the menu. */
function Readout({ created, theme }: Pick<CircuitDebugProps, 'created' | 'theme'>) {
  const detail = useDetail(created?.view);
  const lines = detail && created ? detailLines(detail, created.tier) : [];
  return (
    <div
      // Above the wheel's hint, which takes the bottom middle.
      className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 rounded-md px-3 py-2"
      style={panelStyle(theme)}
      data-testid="detail-readout"
    >
      <Lines lines={[...lines, rendererLine(created)]} />
    </div>
  );
}

/**
 * The circuit viewer's Debug menu: what draws the view, how the morphologies are coming in and what is drawn of them,
 * with the budget, the tolerance, the culling and the renderer to set; and the numbers it can keep over the view.
 */
export function CircuitDebug({ target, created, theme, ...menu }: CircuitDebugProps) {
  const [readout, setReadout] = useState(false);
  return (
    <>
      {createPortal(
        <DebugMenuShell
          testId="circuit-debug"
          body={<MenuBody created={created} readout={readout} onReadout={setReadout} {...menu} />}
        />,
        target
      )}
      {readout && <Readout created={created} theme={theme} />}
    </>
  );
}
