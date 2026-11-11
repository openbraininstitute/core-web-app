import { describe, expect, it } from 'vitest';

import { withWorkflowIdSearch } from '@/ui/segments/workflows/elements/workflow-activity-search';

const UUID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

describe('withWorkflowIdSearch', () => {
  it('turns a pasted UUID into an id lookup, dropping the text search', () => {
    expect(withWorkflowIdSearch({ page: 1, ilike_search: `*${UUID}*` })).toEqual({
      page: 1,
      id: UUID,
    });
  });

  it('handles the plain `search` param the same way', () => {
    expect(withWorkflowIdSearch({ page: 1, search: UUID })).toEqual({ page: 1, id: UUID });
  });

  it('leaves an ordinary term completely alone', () => {
    const params = { page: 1, ilike_search: '*my campaign*' };
    expect(withWorkflowIdSearch(params)).toEqual(params);
  });

  it('leaves a term that merely looks id-ish alone', () => {
    const params = { page: 1, ilike_search: '*3fa85f64-5717*' };
    expect(withWorkflowIdSearch(params)).toEqual(params);
  });

  it('is a no-op when nothing was searched for', () => {
    const params = { page: 1, page_size: 20, order_by: ['-creation_date'] };
    expect(withWorkflowIdSearch(params)).toEqual(params);
  });

  it('leaves an applied id__in filter alone rather than adding a second id condition', () => {
    expect(withWorkflowIdSearch({ id__in: ['other'], ilike_search: `*${UUID}*` })).toEqual({
      id__in: ['other'],
    });
  });

  it('never overwrites an explicit id filter with the search term', () => {
    // clobbering the panel's own `id` would silently widen the result set
    expect(withWorkflowIdSearch({ id: 'chosen-by-the-user', ilike_search: `*${UUID}*` })).toEqual({
      id: 'chosen-by-the-user',
    });
  });

  it('keeps every other filter and the paging params', () => {
    expect(
      withWorkflowIdSearch({
        page: 2,
        page_size: 30,
        lifecycle_status__in: ['active'],
        ilike_search: `*${UUID}*`,
      })
    ).toEqual({ page: 2, page_size: 30, lifecycle_status__in: ['active'], id: UUID });
  });
});
