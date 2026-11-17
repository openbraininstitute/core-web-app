import { renderHook } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it } from 'vitest';

import { useListFilters } from '@/admin/sections/virtual-lab/ui/list-filters';

import type { ReactNode } from 'react';

function paramsFor(scoped: boolean) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NuqsTestingAdapter searchParams={{ q: 'neuron', deleted: 'deleted' }}>
      {children}
    </NuqsTestingAdapter>
  );
  return renderHook(() => useListFilters({ scoped, placeholder: 'Search' }), { wrapper }).result
    .current.params;
}

describe('useListFilters', () => {
  it('sends the deleted scope from the URL for a scoped list', () => {
    expect(paramsFor(true)).toEqual({ query: 'neuron', deleted_only: true });
  });

  it('leaves the deleted scope out for a list without one', () => {
    expect(paramsFor(false)).toEqual({ query: 'neuron' });
  });
});
