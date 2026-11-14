// @vitest-environment node
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { impostorUniforms } from '@/features/circuit-viewer/morphologies/engine/impostors';
import { somaCloudUniforms } from '@/features/circuit-viewer/morphologies/engine/soma-cloud';
import { GpuUniforms } from '@/features/circuit-viewer/morphologies/engine/webgpu/gpu-uniforms';
import { impostorMaterials } from '@/features/circuit-viewer/morphologies/engine/webgpu/impostors-gpu';

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
const materials = impostorMaterials(u, {
  material: new THREE.MeshStandardMaterial(),
} as unknown as Look);

interface Constant {
  value?: number;
  node?: { value: number };
}

interface Call {
  functionNode: { code: string };
  parameters: { ball: Constant; round: Constant };
}

const numberOf = (constant: Constant) => constant.value ?? constant.node?.value;

/** The call of `somaQuad` that places a material's quads. */
function somaQuadOf(material: THREE.Material): Call {
  const seen = new Set<unknown>();
  const queue: unknown[] = [(material as unknown as { positionNode: unknown }).positionNode];
  while (queue.length > 0) {
    const node = queue.shift();
    if (typeof node !== 'object' || node === null || seen.has(node)) continue;
    if (ArrayBuffer.isView(node)) continue;
    seen.add(node);
    const call = node as Partial<Call>;
    if (call.functionNode?.code?.includes('fn somaQuad')) return call as Call;
    queue.push(...Object.values(node));
  }
  throw new Error('no somaQuad');
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
