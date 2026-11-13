import { COMPACT_CAMERA_ZOOM } from '@/features/brain-atlas-viewer/brain-atlas-viewer-gltf/constants';

import type { ViewTransitionInstance } from 'react';

/** Keyframes per morph: a snapshot's counter-scale is not linear in the box's scale. */
const MORPH_SAMPLES = 24;

/**
 * When the views cross-fade, as shares of the morph. The browser fades them with the box's
 * ease-out, so the leaving brain is gone before the arriving viewer draws its own (~90ms
 * with its mesh decoded), and the box goes blank: the leaving view holds until then.
 */
const CROSSFADE = { from: 0.3, to: 0.8 };

/** The camera zoom each atlas view draws its brain at. */
export const ATLAS_ZOOM = { full: 1, mini: COMPACT_CAMERA_ZOOM };

/** The morph's `cubic-bezier(0.19, 1, 0.22, 1)` in globals.css, which approximates this. */
function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - 2 ** (-10 * t);
}

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

/**
 * Runs the atlas morph on the compositor. The browser animates a morphing box's width and
 * height, which needs the main thread, and the arriving view keeps that busy, so the box
 * scales instead. Each snapshot is counter-scaled to keep its proportions, and its brain
 * (as tall as its view times the camera zoom, and centred) grows from one view's size to
 * the other's, so the two brains stay on top of each other while they cross-fade. The scales
 * ride on the browser's own fades: a second animation of a view would keep both off the
 * compositor, and these end with the transition.
 */
export function morphAtlasOnCompositor(
  { group, old, new: next }: ViewTransitionInstance,
  zoom: { from: number; to: number }
) {
  const effect = group.getAnimations()[0]?.effect;
  const [oldFade, newFade] = [old, next].map((view) => fadeOf(view.getAnimations()));
  if (!(effect instanceof KeyframeEffect && oldFade && newFade)) return;
  const duration = Number(effect.getComputedTiming().duration);
  const keyframes = effect.getKeyframes();
  const [first, last] = [keyframes[0], keyframes.at(-1)];
  if (!duration || !first || !last) return;

  const from = new DOMMatrixReadOnly(String(first.transform));
  const to = new DOMMatrixReadOnly(String(last.transform));
  // only a moved box: a rotated or scaled one keeps the browser's morph
  if (![from, to].every((m) => m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1)) return;
  const px = (value: unknown) => Number.parseFloat(String(value));
  const [w0, h0, w1, h1] = [px(first.width), px(first.height), px(last.width), px(last.height)];
  if (!(w0 && h0 && w1 && h1)) return;

  const box: Keyframe[] = [];
  const oldView: Keyframe[] = [];
  const newView: Keyframe[] = [];
  for (let i = 0; i <= MORPH_SAMPLES; i += 1) {
    const offset = i / MORPH_SAMPLES;
    const progress = easeOutExpo(offset);
    const height = lerp(h0, h1, progress);
    const [sx, sy] = [lerp(w0, w1, progress) / w1, height / h1];
    const brainZoom = lerp(zoom.from, zoom.to, progress);
    const oldScale = (height / h0) * (brainZoom / zoom.from);
    const newScale = (height / h1) * (brainZoom / zoom.to);
    const fade = Math.min(
      1,
      Math.max(0, (offset - CROSSFADE.from) / (CROSSFADE.to - CROSSFADE.from))
    );
    const shown = fade * fade * (3 - 2 * fade);
    box.push({
      offset,
      transform: `translate(${lerp(from.e, to.e, progress)}px, ${lerp(from.f, to.f, progress)}px) scale(${sx}, ${sy})`,
    });
    oldView.push({
      offset,
      opacity: 1 - shown,
      transform: `scale(${oldScale / sx}, ${oldScale / sy})`,
    });
    newView.push({
      offset,
      opacity: shown,
      transform: `scale(${newScale / sx}, ${newScale / sy})`,
    });
  }
  effect.setKeyframes(box);
  oldFade.setKeyframes(oldView);
  newFade.setKeyframes(newView);
}

/** A view's opacity animation: the browser's fade in or out. */
function fadeOf(animations: Animation[]) {
  return animations
    .map((animation) => animation.effect)
    .find(
      (effect): effect is KeyframeEffect =>
        effect instanceof KeyframeEffect &&
        effect.getKeyframes().some((keyframe) => 'opacity' in keyframe)
    );
}
