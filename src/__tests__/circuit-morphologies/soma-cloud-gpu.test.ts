// @vitest-environment node
import * as THREE from 'three';
import { positionGeometry } from 'three/tsl';
import { describe, expect, it } from 'vitest';

import { impostorUniforms } from '@/features/circuit-viewer/morphologies/engine/impostors';
import { somaCloudUniforms } from '@/features/circuit-viewer/morphologies/engine/soma-cloud';
import { VIEW, VIEW_WGSL } from '@/features/circuit-viewer/morphologies/engine/webgpu/cells-wgsl';
import { GpuUniforms } from '@/features/circuit-viewer/morphologies/engine/webgpu/gpu-uniforms';
import {
  DISC_COORD,
  somaCloudMaterials,
} from '@/features/circuit-viewer/morphologies/engine/webgpu/soma-cloud-gpu';

const dots = () => ({
  uViewport: { value: new THREE.Vector4() },
  uRadius: { value: 1 },
  uMinRadius: { value: 1 },
  uRingColour: { value: new THREE.Vector3() },
  uScale: { value: 1 },
});

const { cloud, id } = somaCloudMaterials(
  new GpuUniforms({
    impostors: impostorUniforms(),
    cloud: somaCloudUniforms(),
    segments: { uSegments: { value: 0 } },
    electrodes: dots(),
    synapses: dots(),
    markers: dots(),
  })
);

interface Call {
  functionNode: { code: string; includes: unknown[] };
  parameters: Record<string, unknown>;
}

describe('the somas on WebGPU, as on WebGL 2', () => {
  it('places a pyramid a cell by its whole corner, its tip lifted a radius by the view’s `lifted`', () => {
    for (const material of [cloud, id]) {
      const call = material.vertexNode as unknown as Call;
      expect(call.parameters.corner).toBe(positionGeometry);
      expect(call.functionNode.code).toContain(
        'lifted(vec3f(c.xy + corner.xy * r, c.z), corner.z * r, projection)'
      );
      expect(call.functionNode.includes).toContain(VIEW);
    }
  });

  it('reads each cell by the cell it is given, not by the instance’s number', () => {
    for (const material of [cloud, id]) {
      const { texel } = (material.vertexNode as unknown as Call).parameters as {
        texel: { uvNode: Call };
      };
      const cell = texel.uvNode.parameters.cell as { getAttributeName(): string; nodeType: string };
      expect([cell.getAttributeName(), cell.nodeType]).toEqual(['aCell', 'uint']);
    }
  });

  it('runs the disc’s coordinate straight across the screen', () => {
    expect(DISC_COORD.interpolationType).toBe('linear');
  });

  // A fragment node would write nothing of the surface.
  it('writes the sphere’s surface for the occlusion, and how lit it is, beside its colour', () => {
    expect(cloud.fragmentNode).toBeNull();
    expect(cloud.outputNode).not.toBeNull();
    expect(cloud.maskNode).not.toBeNull();
    const surfaces = cloud.mrtNode as unknown as { outputNodes: Record<string, unknown> };
    expect(Object.keys(surfaces.outputNodes).sort()).toEqual(['lit', 'surface']);
  });
});

describe('`lifted`, as the segments and the somas share it', () => {
  it('lifts the whole way in an orthographic view, and in perspective by half the depth at most, behind the near plane', () => {
    expect(VIEW_WGSL).toContain(
      'if (isOrthographic(projection)) { return vec3f(p.xy, p.z + lift); }'
    );
    // The near plane at depth 0, as WebGPU has it.
    expect(VIEW_WGSL).toContain('let near = projection[3][2] / projection[2][2];');
    expect(VIEW_WGSL).toContain('let z = max(p.z, min(p.z + lift, min(0.5 * p.z, -1.01 * near)));');
  });
});
