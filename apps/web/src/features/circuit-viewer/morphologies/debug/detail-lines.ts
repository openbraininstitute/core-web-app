import { fmt } from '@/features/viewer-3d/chrome/debug-rows';
import { megabytes } from '@/features/viewer-3d/chrome/status';

import { BLOCK } from '../engine/segment-arena';

import type { CreatedView, Tier } from '../engine/create-view';
import type { DetailStats } from '../types';
import type { MorphologiesLoad, MorphologiesStop, PackFile } from '../use-circuit-morphologies';

interface PackLoad {
  pack: PackFile | null;
  load: MorphologiesLoad;
  stopped: MorphologiesStop | null;
}

/** How a host's morphologies are coming in: a circuit's pack, or a morphology per cell. */
export type CircuitDebugLoad = PackLoad | { loaded: number; failed: number; total: number };

const TIERS: Record<Tier, string> = { webgpu: 'WebGPU', webgl: 'WebGL 2' };

const STOPS: Record<MorphologiesStop, string> = {
  failed: 'the load failed',
  cut: 'the rest did not come in',
  changed: 'built again since it was named',
};

export function rendererLine(created: CreatedView | null): string {
  if (!created) return 'No view at the moment';
  const { tier, reason } = created;
  return `Drawn with ${TIERS[tier]}${reason ? `: ${reason}` : ''}`;
}

function packLine({ pack, load, stopped }: PackLoad): string {
  if (!pack) return 'No pack ready';
  const size = `Pack: ${megabytes(pack.size)} MB`;
  if (stopped) return `${size}, ${STOPS[stopped]}`;
  if (load.status === 'idle') return `${size}, not loading`;
  const coming = load.status === 'loading' ? load : load.coming;
  return coming ? `${size}, ${megabytes(coming.received)} MB received` : `${size}, all in`;
}

export function loadLines(cells: number, load: CircuitDebugLoad | undefined): string[] {
  const lines = [`${fmt(cells)} cells placed`];
  if (!load) return lines;
  if ('pack' in load) return [...lines, packLine(load)];
  const failed = load.failed > 0 ? `, ${fmt(load.failed)} failed` : '';
  return [...lines, `Morphologies: ${fmt(load.loaded)} of ${fmt(load.total)} loaded${failed}`];
}

export function detailLines(detail: DetailStats, tier: Tier): string[] {
  const held = tier === 'webgpu' && detail.culling ? 'resident' : 'drawn';
  const leftOut = detail.leftOut > 0 ? `, ${fmt(detail.leftOut)} boxes left out` : '';
  const finer = detail.base ? ' by the levels finer than the base' : '';
  const levels = detail.levels
    .map(({ toleranceUm, boxes }) => `${toleranceUm} µm × ${fmt(boxes)}`)
    .join(', ');
  const lines = [
    `${fmt(detail.drawn)} segments ${held} of ${fmt(detail.wanted)} wanted${leftOut}`,
    `Budget taken: ${fmt(detail.room)} of ${fmt(detail.budget)}${finer}, in blocks of ${BLOCK}`,
    `Boxes by level: ${levels}`,
  ];
  if (detail.floor >= 0) {
    const { toleranceUm } = detail.levels[detail.floor];
    lines.push(`Every box at least at ${toleranceUm} µm, which fits the budget whole`);
  }
  if (detail.culled) {
    const { tested, kept, drawn, boxes } = detail.culled;
    lines.push(
      `Culled: ${fmt(tested)} tested, ${fmt(kept)} kept, ${fmt(drawn)} drawn; ${fmt(boxes)} boxes seen`
    );
  }
  return lines;
}
