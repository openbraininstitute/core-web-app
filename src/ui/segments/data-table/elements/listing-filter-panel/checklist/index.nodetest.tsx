import { renderToStaticMarkup } from 'react-dom/server';

import { DEFAULT_CHECKLIST_RENDER_LENGTH } from '@/constants';

import type { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import type { TCoreFilter } from '@/entity-configuration/definitions/types';

import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

describe('CheckList', () => {
  it('renders all options when the option count matches the default checklist length', async () => {
    mock.module('@/ui/segments/data-table/elements/listing-filter-panel/search-filter', {
      namedExports: {
        SearchFilter: () => null,
      },
    });

    mock.module('@/entity-configuration/definitions', {
      namedExports: {
        getFieldDefinition: () => null,
      },
    });

    const { CheckList } = await import('./index');
    const data = Array.from({ length: DEFAULT_CHECKLIST_RENDER_LENGTH }, (_, index) => ({
      id: `option-${index + 1}`,
      label: `Option ${index + 1}`,
      value: `Option ${index + 1}`,
      count: index + 1,
    }));
    const filter: TCoreFilter = {
      field: 'test.field' as EntityCoreFields,
      type: null,
      value: null,
    };

    const markup = renderToStaticMarkup(
      <CheckList data={data} filter={filter} values={[]} onChange={() => undefined}>
        {({ options, renderLength }) => (
          <ul>
            {options?.slice(0, renderLength).map(({ id, label }) => (
              <li key={id}>{label}</li>
            ))}
          </ul>
        )}
      </CheckList>
    );

    assert.equal(
      (markup.match(/<li>/g) ?? []).length,
      DEFAULT_CHECKLIST_RENDER_LENGTH,
      'the checklist should show all default options before requiring load more'
    );
  });
});
