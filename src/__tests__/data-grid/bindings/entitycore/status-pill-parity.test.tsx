import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { CampaignStatusBadge } from '@/features/data-grid/bindings/entitycore/renderers/campaign-status-badge';
import { EntityLifecycleStatus, LifecycleStatusBadge } from '@/ui/molecules/lifecycle-status-badge';

const pill = (ui: React.ReactElement): HTMLElement => {
  const { container } = render(ui);
  const el = container.querySelector<HTMLElement>('[data-slot="badge"]');
  if (!el) throw new Error('no badge rendered');
  return el;
};

/** Every height utility on the element, so a local override cannot slip back in. */
const heightClasses = (el: HTMLElement) =>
  Array.from(el.classList).filter((c) => /^h-|^!h-|h-\[/.test(c));

/** The two pills share table rows, so they must share a footprint. */
describe('status pills share one footprint', () => {
  const lifecycle = () => pill(<LifecycleStatusBadge status={EntityLifecycleStatus.Active} />);
  const campaign = () => pill(<CampaignStatusBadge status={ActivityStatus.DONE} />);

  it('gives both pills the same height', () => {
    expect(heightClasses(lifecycle())).toEqual(heightClasses(campaign()));
  });

  it('takes that height from the shared size, with no local override', () => {
    // `size="sm"` is the single source of the height
    expect(heightClasses(lifecycle())).toEqual(['h-8']);
  });

  it('gives both pills the same text size and weight', () => {
    const typography = (el: HTMLElement) =>
      Array.from(el.classList)
        .filter((c) => c.startsWith('text-') || c.startsWith('font-'))
        // tone colours differ by status; only the sizing/weight is shared
        .filter((c) => !/^text-(green|red|slate|blue|amber|zinc|gray)-/.test(c))
        .sort();

    expect(typography(lifecycle())).toEqual(typography(campaign()));
  });

  it('still lets the compact campaign pill opt out deliberately', () => {
    const compact = pill(<CampaignStatusBadge compact status={ActivityStatus.DONE} />);
    expect(heightClasses(compact)).toEqual(['h-[18px]']);
  });
});
