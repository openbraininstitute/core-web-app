import {
  RiCapsuleLine,
  RiCpuLine,
  RiResetLeftLine,
  RiRulerLine,
  RiShuffleLine,
} from '@remixicon/react';

import { SegmentedToggle } from '@/features/scan-config/components/color-by/chrome-menu';

import { type BuildSettings, DEFAULT_BUILD, DEFAULT_BUMPS } from '../constants';
import { MAX_BUMP_AMPLITUDE } from '../engine/looks';
import { MIN_RADIUS_VOXELS } from '../engine/mesher';
import { Heading, HelpRow, ICON, Note, SectionTitle, SliderRow, ToggleRow } from './menu-rows';

import type { AxonRadiusMode } from '../engine/prepare';
import type { GpuStatus } from '../use-morphology-mesh';
import type { UpdateSettings, ViewerSettings } from '../use-viewer-settings';

/** The voxel slider's ends, as powers of ten: 0.056 to 2 µm. */
const VOXEL_LOG = { min: -1.25, max: Math.log10(2) };

const unit =
  (suffix = '', digits = 2) =>
  (v: number) =>
    `${v.toFixed(digits)}${suffix && ` ${suffix}`}`;

interface DebugControlsProps {
  settings: ViewerSettings;
  update: UpdateSettings;
  /** Whether the session has a GPU to build on; null until the first build has asked. */
  gpu: GpuStatus | null;
}

/** How the mesh is built, as the POC's panel had it, and the bumps' shape. */
export function DebugControls({ settings, update, gpu }: DebugControlsProps) {
  const { build, bump } = settings;
  const set = (patch: Partial<BuildSettings>) => update({ build: { ...build, ...patch } });
  const setBump = (patch: Partial<typeof bump>) => update({ bump: { ...bump, ...patch } });
  const noGpu = gpu?.adapter === null ? gpu.reason : null;

  return (
    <div className="flex flex-col text-neutral-700">
      <SectionTitle title="Controls" topic="controls" className="px-2 pt-1">
        <button
          type="button"
          aria-label="Reset the controls"
          onClick={() => update({ build: DEFAULT_BUILD, bump: DEFAULT_BUMPS })}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-normal text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-primary-9"
        >
          <RiResetLeftLine aria-hidden className="size-3.5" />
          Reset
        </button>
      </SectionTitle>

      <Heading>Skeleton</Heading>
      <SliderRow
        title="Smoothing σ"
        topic="smoothing"
        min={0}
        max={4}
        step={0.1}
        value={build.smoothing}
        onChange={(smoothing) => set({ smoothing })}
        format={unit('µm', 1)}
      />
      <HelpRow
        title="Axon radius"
        topic="axon-radius"
        icon={<RiRulerLine className={ICON} />}
        className="flex-wrap"
      >
        <SegmentedToggle<AxonRadiusMode>
          value={build.axonRadius}
          onChange={(axonRadius) => set({ axonRadius })}
          options={[
            { value: 'same', label: 'Axon radius as traced', text: 'Traced' },
            { value: 'heavy', label: 'Axon radius heavily smoothed', text: 'Heavy' },
            { value: 'constant', label: 'Constant axon radius', text: 'Constant' },
          ]}
        />
      </HelpRow>
      <SliderRow
        title="Axon step"
        topic="axon-step"
        min={1}
        max={5}
        step={0.5}
        value={build.axonStep}
        onChange={(axonStep) => set({ axonStep })}
        format={unit('µm', 1)}
      />
      <SliderRow
        title="Simplify"
        topic="simplify"
        min={0}
        max={2}
        step={0.05}
        value={build.simplify}
        onChange={(simplify) => set({ simplify })}
        format={unit('× voxel')}
      />
      <ToggleRow
        title="Untangle fibres"
        topic="untangle"
        icon={<RiShuffleLine className={ICON} />}
        checked={build.untangle}
        onChange={(untangle) => set({ untangle })}
      />

      <Heading>Mesh</Heading>
      <ToggleRow
        title="Tubes"
        topic="tubes"
        icon={<RiCapsuleLine className={ICON} />}
        checked={build.tubes}
        onChange={(tubes) => set({ tubes })}
      />
      <SliderRow
        title="Tube aspect"
        topic="tube-aspect"
        min={1}
        max={16}
        step={1}
        value={build.tubeAspect}
        onChange={(tubeAspect) => set({ tubeAspect })}
        format={(v) => `${v} : 1`}
        disabled={!build.tubes}
      />
      <SliderRow
        title="Voxel size"
        topic="voxel"
        {...VOXEL_LOG}
        step={0.005}
        value={Math.log10(build.voxel)}
        onChange={(v) => set({ voxel: 10 ** v })}
        format={(v) => unit('µm', 3)(10 ** v)}
      />
      <SliderRow
        title="Min radius"
        topic="min-radius"
        min={MIN_RADIUS_VOXELS}
        max={2}
        step={0.05}
        value={build.minRadius}
        onChange={(minRadius) => set({ minRadius })}
        format={unit('× voxel')}
      />
      <SliderRow
        title="Neurite blend"
        topic="blend"
        min={0.1}
        max={2}
        step={0.05}
        value={build.blend}
        onChange={(blend) => set({ blend })}
        format={unit('× r')}
      />
      <SliderRow
        title="Soma blend"
        topic="soma-blend"
        min={0.2}
        max={3}
        step={0.05}
        value={build.somaBlend}
        onChange={(somaBlend) => set({ somaBlend })}
        format={unit('× r')}
      />
      <SliderRow
        title="Mesh simplify"
        topic="mesh-simplify"
        min={0}
        max={1}
        step={0.05}
        value={build.simplifyMesh}
        onChange={(simplifyMesh) => set({ simplifyMesh })}
        format={unit('× voxel')}
      />
      <ToggleRow
        title="GPU"
        topic="gpu"
        icon={<RiCpuLine className={ICON} />}
        checked={build.gpu && !noGpu}
        onChange={(on) => set({ gpu: on })}
        disabled={!gpu?.adapter}
      />
      {noGpu && <Note>{noGpu}</Note>}

      <Heading>Bumps</Heading>
      {!settings.bumps && <Note>Turn on Bumps in the settings to see them.</Note>}
      <SliderRow
        title="Bump height"
        topic="bump-amp"
        min={0}
        max={MAX_BUMP_AMPLITUDE}
        step={0.005}
        value={bump.amplitude}
        onChange={(amplitude) => setBump({ amplitude })}
        format={unit('× r', 3)}
        disabled={!settings.bumps}
      />
      <SliderRow
        title="Bump scale"
        topic="bump-scale"
        min={0.5}
        max={5}
        step={0.1}
        value={bump.scale}
        onChange={(scale) => setBump({ scale })}
        format={unit('µm', 1)}
        disabled={!settings.bumps}
      />
      <SliderRow
        title="Bump smoothness"
        topic="bump-smooth"
        min={0}
        max={1}
        step={0.05}
        value={bump.smoothness}
        onChange={(smoothness) => setBump({ smoothness })}
        format={unit()}
        disabled={!settings.bumps}
      />
    </div>
  );
}
