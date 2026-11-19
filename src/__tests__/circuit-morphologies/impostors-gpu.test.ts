// @vitest-environment node
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { impostorUniforms } from '@/features/circuit-viewer/morphologies/engine/impostors';
import { somaCloudUniforms } from '@/features/circuit-viewer/morphologies/engine/soma-cloud';
import { arenaStorage } from '@/features/circuit-viewer/morphologies/engine/webgpu/arena-gpu';
import { GpuUniforms } from '@/features/circuit-viewer/morphologies/engine/webgpu/gpu-uniforms';
import {
  arenaMaterials,
  drawBySpikes,
  impostorMaterials,
} from '@/features/circuit-viewer/morphologies/engine/webgpu/impostors-gpu';

import type { Look } from '@/features/viewer-3d/engine/looks';

const dots = () => ({
  uViewport: { value: new THREE.Vector4() },
  uRadius: { value: 1 },
  uMinRadius: { value: 1 },
  uRingColour: { value: new THREE.Vector3() },
  uScale: { value: 1 },
});

const u = new GpuUniforms({
  impostors: impostorUniforms(),
  cloud: somaCloudUniforms(),
  segments: { uSegments: { value: 0 } },
  electrodes: dots(),
  synapses: dots(),
  markers: dots(),
});
const look = { material: new THREE.MeshStandardMaterial() } as unknown as Look;
const materials = impostorMaterials(u, look);
const arena = arenaMaterials(u, look, arenaStorage());

interface Constant {
  value?: number;
  node?: { value: number };
}

interface Call {
  functionNode: { code: string };
  parameters: { ball: Constant; round: Constant };
}

const numberOf = (constant: Constant) => constant.value ?? constant.node?.value;

/** Everything `nodes` reach. */
function reached(nodes: unknown[]): Set<unknown> {
  const seen = new Set<unknown>();
  const queue = [...nodes];
  while (queue.length > 0) {
    const node = queue.shift();
    if (typeof node !== 'object' || node === null || seen.has(node)) continue;
    if (ArrayBuffer.isView(node)) continue;
    seen.add(node);
    queue.push(...Object.values(node));
  }
  return seen;
}

/** The call of `somaQuad` that places a material's quads. */
function somaQuadOf(material: THREE.Material): Call {
  const { positionNode } = material as unknown as { positionNode: unknown };
  for (const node of reached([positionNode])) {
    const call = node as Partial<Call>;
    if (call.functionNode?.code?.includes('fn somaQuad')) return call as Call;
  }
  throw new Error('no somaQuad');
}

const SPIKES = { glow: u.glow, somas: u.somas, afterglow: u.afterglow, neon: u.neon };

/** Which of the spikes' inputs a material's nodes read. */
function spikesRead(material: THREE.Material): string[] {
  const nodes = reached(Object.values(material).filter((value) => value?.isNode));
  return Object.entries(SPIKES)
    .filter(([, input]) => nodes.has(input))
    .map(([name]) => name);
}

const depthOf = (material: THREE.Material) =>
  (material as unknown as { depthNode: unknown }).depthNode ?? null;

describe('the somas of the morphologies on WebGPU', () => {
  it('draws them in the look in two draws: flat discs under `ballFrom`, and balls from it', () => {
    expect(materials.soma).toHaveLength(2);
    const [disc, ball] = materials.soma.map(somaQuadOf);
    expect(numberOf(disc.parameters.ball)).toBe(0);
    expect(numberOf(ball.parameters.ball)).toBe(1);
    expect(disc.parameters.round).toBe(u.ballFrom);
    expect(ball.parameters.round).toBe(u.ballFrom);
  });

  it('leaves a soma out of the draw of the other kind', () => {
    for (const material of materials.soma)
      expect(somaQuadOf(material).functionNode.code).toMatch(
        /if \(\(r \/ um >= round\) != \(ball > 0\.5\)\) \{ return none; \}/
      );
  });

  it("stands a disc at the sphere's nearest point, where its fragments write no depth of their own", () => {
    const [disc, ball] = materials.soma;
    expect(somaQuadOf(disc).functionNode.code).toMatch(/if \(ball < 0\.5\)\s*\{\s*p = lifted\(/);
    expect(depthOf(disc)).toBeNull();
    expect(depthOf(ball)).not.toBeNull();
  });

  it('picks a soma as the look draws it, in the same two draws', () => {
    for (const picks of [materials.ids.soma, materials.spots.soma]) {
      const calls = picks.map(somaQuadOf);
      expect(calls.map((call) => numberOf(call.parameters.ball))).toEqual([0, 1]);
      for (const call of calls) expect(call.parameters.round).toBe(u.ballFrom);
      expect(picks.map((material) => depthOf(material) !== null)).toEqual([false, true]);
    }
  });

  it('draws every soma as a ball where it is lit through what covers it', () => {
    const { ball, round } = somaQuadOf(materials.through.soma).parameters;
    expect([numberOf(ball), numberOf(round)]).toEqual([1, 0]);
  });
});

describe('the two kinds of the segments on WebGPU', () => {
  it('reads nothing of the spikes in the segments drawn with no replay loaded', () => {
    const plain = [...materials.segment, ...arena.segment];
    expect(plain).toHaveLength(4);
    for (const material of plain) expect(spikesRead(material)).toEqual([]);
  });

  it('lights the segments by the spikes in the other kind', () => {
    for (const material of [...materials.spikingSegment, ...arena.spikingSegment]) {
      expect(spikesRead(material)).toEqual(['glow', 'somas', 'afterglow', 'neon']);
    }
  });

  const shown = (list: THREE.Material[]) => list.map((material) => material.visible);

  it('starts with the kind for no replay, so that a frame the switch missed draws no segment twice', () => {
    for (const kinds of [impostorMaterials(u, look), arenaMaterials(u, look, arenaStorage())]) {
      expect(shown(kinds.segment)).toEqual([true, true]);
      expect(shown(kinds.spikingSegment)).toEqual([false, false]);
    }
  });

  it('draws with the lit kind while a replay is loaded, and with the other while none is', () => {
    for (const kinds of [materials, arena]) {
      drawBySpikes(kinds, true);
      expect(shown(kinds.segment)).toEqual([false, false]);
      expect(shown(kinds.spikingSegment)).toEqual([true, true]);
      drawBySpikes(kinds, false);
      expect(shown(kinds.segment)).toEqual([true, true]);
      expect(shown(kinds.spikingSegment)).toEqual([false, false]);
    }
  });

  it('lights the somas in one kind, without a distance of their own', () => {
    for (const material of materials.soma) {
      expect(spikesRead(material)).toEqual(['glow', 'afterglow', 'neon']);
    }
  });

  it('widens a glowing cell in the depth before the tests in one kind, which reads the glow alone', () => {
    for (const material of [...arena.kept, ...arena.seenDepth]) {
      expect(spikesRead(material)).toEqual(['glow']);
    }
  });

  it('leaves the picks without the spikes and the line through with them', () => {
    for (const material of [...materials.ids.segment, ...materials.ids.soma, ...arena.ids]) {
      expect(spikesRead(material)).toEqual([]);
    }
    for (const material of [...materials.through.segment, ...arena.through]) {
      expect(spikesRead(material)).toContain('glow');
    }
  });
});
