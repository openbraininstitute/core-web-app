import { beforeEach, describe, expect, it, vi } from 'vitest';

const cms = vi.hoisted(() => ({ hero: vi.fn(), body: vi.fn() }));
vi.mock('@/services/sanity/api/get-hero-content', () => ({ getHeroContent: cms.hero }));
vi.mock('@/services/sanity/api/get-rtf-content', () => ({ getRTFContent: cms.body }));

import { getHeroContent, getPricingContent, getRTFContent, getShowcase } from './content';
import { usesSanityContent } from './sources';

beforeEach(() => vi.clearAllMocks());

describe('public website content ownership', () => {
  it.each([
    '/',
    'about',
    'mission',
    'team',
    'resources',
    'notebooks',
    'contact',
    'features',
    'pricing',
    'gallery',
    'showcases',
    'sfn-2025',
    'the-real-digital-brain-story',
  ])('serves %s from the project without contacting the CMS', async (slug) => {
    expect(usesSanityContent(slug)).toBe(false);
    expect(await getHeroContent(slug)).toHaveProperty('title');
    expect(Array.isArray(await getRTFContent(slug))).toBe(true);
    expect(cms.hero).not.toHaveBeenCalled();
    expect(cms.body).not.toHaveBeenCalled();
  });

  it.each([
    'news',
    'privacy',
    'terms',
    'financing',
    'releasing-soon',
  ])('continues reading fresh %s content from Sanity', async (slug) => {
    cms.hero.mockResolvedValueOnce({ title: 'Updated in Sanity' });
    cms.body.mockResolvedValueOnce([{ _type: 'updated' }]);
    expect(usesSanityContent(`/${slug}`)).toBe(true);
    expect(await getHeroContent(slug)).toEqual({ title: 'Updated in Sanity' });
    expect(await getRTFContent(slug)).toEqual([{ _type: 'updated' }]);
    expect(cms.hero).toHaveBeenCalledWith(slug);
    expect(cms.body).toHaveBeenCalledWith(slug);
  });

  it('does not silently fall back to Sanity for a missing local page', async () => {
    await expect(getHeroContent('unconfigured-page')).rejects.toThrow('Missing local website page');
    expect(cms.hero).not.toHaveBeenCalled();
  });

  it('preserves the four public plans and handles missing showcases', async () => {
    expect((await getPricingContent()).map((plan) => plan.name)).toEqual(
      expect.arrayContaining(['Free', 'Pro', 'Enterprise', 'Education'])
    );
    expect(await getShowcase('does-not-exist')).toBeNull();
  });
});
