import { expect, it } from 'vitest';

import { LANDING_MODELS, landingModelsForViewport } from './landing-models';
import manifest from './optimized-media.json';

it('preserves the desktop master while using a much smaller full-length column on phones', () => {
  expect(landingModelsForViewport(false)).toBe(LANDING_MODELS);
  expect(landingModelsForViewport(false)[0].video).toBe('/static/landing-v1/microcircuits.mp4');
  const phone = landingModelsForViewport(true);
  const file = manifest['/static/landing-v1/microcircuits.mp4'].full;
  expect(phone[0].video).toBe(file.src);
  expect(file.bytes).toBeLessThan(file.originalBytes * 0.2);
  expect(phone.map(({ heroBounds }) => heroBounds)).toEqual(
    LANDING_MODELS.map(({ heroBounds }) => heroBounds)
  );
});
