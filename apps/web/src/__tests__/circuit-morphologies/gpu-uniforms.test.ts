// @vitest-environment node
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { impostorUniforms } from '@/features/circuit-viewer/morphologies/engine/impostors';
import { somaCloudUniforms } from '@/features/circuit-viewer/morphologies/engine/soma-cloud';
import { GpuUniforms } from '@/features/circuit-viewer/morphologies/engine/webgpu/gpu-uniforms';

const dots = (radius: number, minRadius: number) => ({
  uViewport: { value: new THREE.Vector4() },
  uRadius: { value: radius },
  uMinRadius: { value: minRadius },
  uRingColour: { value: new THREE.Vector3(0.1, 0.2, 0.3) },
  uScale: { value: 1 },
});

function held() {
  return {
    impostors: impostorUniforms(),
    cloud: somaCloudUniforms(),
    segments: { uSegments: { value: 0 } },
    electrodes: dots(5, 2),
    synapses: dots(0.5, 2),
    markers: dots(3, 6),
  };
}

describe('the WebGPU tier’s uniforms', () => {
  it("take what the view's holders hold when synced, and only then", () => {
    const from = held();
    const u = new GpuUniforms(from);
    const table = new THREE.DataTexture(new Uint8Array(4), 1, 1);
    from.impostors.uCells.value = table;
    from.impostors.uHighlighted.value = 7;
    from.impostors.uMix.value = 0.4;
    from.impostors.uShift.value.set(1, 2, 3);
    from.impostors.uSectionColours.value[2].set(0xff0000);
    from.impostors.uHidden.value = 2;
    from.cloud.uRadius.value = 12;
    from.cloud.uOpacity.value = 0.5;
    from.segments.uSegments.value = 99;
    from.electrodes.uScale.value = 0.5;
    expect(u.mix.value).toBe(0);

    u.sync();

    expect(u.cells.value).toBe(table);
    expect(u.highlighted.value).toBe(7);
    expect(u.mix.value).toBe(0.4);
    expect(u.shift.value.toArray()).toEqual([1, 2, 3]);
    expect(u.sectionColours[2].value.getHex()).toBe(0xff0000);
    expect(u.hidden.value).toBe(2);
    expect([u.radius.value, u.opacity.value, u.segments.value]).toEqual([12, 0.5, 99]);
    expect([u.electrodes.radius.value, u.synapses.radius.value, u.markers.minRadius.value]).toEqual(
      [5, 0.5, 6]
    );
    expect(u.ringColour.value.toArray()).toEqual([0.1, 0.2, 0.3]);
    expect(u.dotScale.value).toBe(0.5);
  });

  it('bind a blank table while there is none, not the one before', () => {
    const from = held();
    const u = new GpuUniforms(from);
    const blank = u.cells.value;
    from.impostors.uCells.value = new THREE.DataTexture(new Uint8Array(4), 1, 1);
    u.sync();
    from.impostors.uCells.value = null;
    u.sync();
    expect(u.cells.value).toBe(blank);
  });
});
