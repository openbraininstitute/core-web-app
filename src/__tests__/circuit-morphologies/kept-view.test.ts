// @vitest-environment node
import * as THREE from 'three/webgpu';
import { describe, expect, it } from 'vitest';

import { KeptView } from '@/features/circuit-viewer/morphologies/engine/webgpu/kept-view';

const UP = new THREE.Vector3(0, 1, 0);
const turned = (degrees: number) =>
  new THREE.Quaternion().setFromAxisAngle(UP, (degrees * Math.PI) / 180);
const at = (x: number) => new THREE.Vector3(x, 0, 0);
/** A view 800 CSS pixels high, a pixel spanning 2 µm at the orbit's target: 1600 µm high. */
const SPAN = 2;
const HEIGHT = 800;

function kept() {
  const view = new KeptView();
  view.set(turned(0), at(0), SPAN);
  return view;
}

describe('the view the kept list was made for', () => {
  it('is not stale before any list was made', () => {
    expect(new KeptView().stale(turned(180), at(1e6), 100, HEIGHT)).toBe(false);
  });

  it('is stale once the view has turned over 15 degrees', () => {
    expect(kept().stale(turned(14), at(0), SPAN, HEIGHT)).toBe(false);
    expect(kept().stale(turned(16), at(0), SPAN, HEIGHT)).toBe(true);
    expect(kept().stale(turned(-16), at(0), SPAN, HEIGHT)).toBe(true);
  });

  it('is stale once a pixel spans half as much again, and not for zooming in', () => {
    expect(kept().stale(turned(0), at(0), SPAN * 1.4, HEIGHT)).toBe(false);
    expect(kept().stale(turned(0), at(0), SPAN * 1.6, HEIGHT)).toBe(true);
    expect(kept().stale(turned(0), at(0), SPAN / 8, HEIGHT * 8)).toBe(false);
  });

  it('is stale once the target has moved over a quarter of the view height', () => {
    expect(kept().stale(turned(0), at(390), SPAN, HEIGHT)).toBe(false);
    expect(kept().stale(turned(0), at(410), SPAN, HEIGHT)).toBe(true);
    // Zoomed in eight times, the view is 200 µm high.
    expect(kept().stale(turned(0), at(60), SPAN / 8, HEIGHT)).toBe(true);
  });

  it('is stale for the other camera until a list is made for it', () => {
    const view = kept();
    view.projectionChanged();
    expect(view.stale(turned(0), at(0), SPAN, HEIGHT)).toBe(true);
    view.set(turned(0), at(0), SPAN);
    expect(view.stale(turned(0), at(0), SPAN, HEIGHT)).toBe(false);
  });

  it('is measured from the view the list was last made for', () => {
    const view = kept();
    view.set(turned(90), at(1000), SPAN);
    expect(view.stale(turned(100), at(1100), SPAN, HEIGHT)).toBe(false);
    expect(view.stale(turned(0), at(0), SPAN, HEIGHT)).toBe(true);
  });
});
