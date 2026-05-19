import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_CHECKLIST_RENDER_LENGTH } from '@/constants';

import { CheckList } from './index';

import type { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import type { TCoreFilter } from '@/entity-configuration/definitions/types';

vi.mock('@/ui/segments/data-table/elements/listing-filter-panel/search-filter', () => ({
  SearchFilter: () => null,
}));

vi.mock('@/entity-configuration/definitions', () => ({
  getFieldDefinition: () => null,
}));

describe('CheckList', () => {
  it('renders all options when the option count matches the default checklist length', () => {
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

    expect((markup.match(/<li>/g) ?? []).length).toBe(DEFAULT_CHECKLIST_RENDER_LENGTH);
  });
});
