import { describe, expect, it, vi } from 'vitest';

import { AgentType } from '@/ui/segments/contribute/shared/types';

import { parseContributionCsvValue, parseLocationCsvValue } from './csv-tuple-parser';

import type { EntityImportRuntimeContext } from '@/features/entity-import/core/adapter';
import type { ISuggestion } from '@/features/entity-import/core/contracts';
import type { ICellMorphologyImportServices } from './services';

const context: EntityImportRuntimeContext = {
  projectId: 'project-1',
  virtualLabId: 'lab-1',
};

type ContributionQuery = ICellMorphologyImportServices[keyof Pick<
  ICellMorphologyImportServices,
  'queryPerson' | 'queryOrganization' | 'queryConsortium' | 'queryRole'
>];

function createQueryMock(
  suggestionsByQuery: Record<string, Array<ISuggestion>>
): ContributionQuery {
  return vi.fn(async ({ query }: { query: string }) => ({
    suggestions: suggestionsByQuery[query] ?? [],
    nextPageParam: null,
  }));
}

function createServices(
  overrides: Partial<
    Pick<
      ICellMorphologyImportServices,
      'queryPerson' | 'queryOrganization' | 'queryConsortium' | 'queryRole'
    >
  > = {}
) {
  return {
    queryPerson: createQueryMock({}),
    queryOrganization: createQueryMock({}),
    queryConsortium: createQueryMock({}),
    queryRole: createQueryMock({}),
    ...overrides,
  };
}

describe('parseLocationCsvValue', () => {
  it('parses a valid tuple and canonicalizes it to the internal summary format', () => {
    expect(parseLocationCsvValue('(10, 20, 30)')).toEqual({
      rawValue: '10, 20, 30',
      parsedValue: { x: 10, y: 20, z: 30 },
      issues: [],
    });
  });

  it('reports malformed non-empty tuples as invalid', () => {
    expect(parseLocationCsvValue('(10, 20)')).toEqual({
      rawValue: '(10, 20)',
      parsedValue: null,
      issues: ['Location must be provided as a tuple in the form `(x, y, z)`.'],
    });
  });
});

describe('parseContributionCsvValue', () => {
  it('resolves a full explicit tuple `(type, name, role)`', async () => {
    const services = createServices({
      queryPerson: createQueryMock({
        'Jane Doe': [{ value: 'person-1', label: 'Jane Doe' }],
      }),
      queryRole: createQueryMock({
        Author: [{ value: 'role-1', label: 'Author' }],
      }),
    });

    const result = await parseContributionCsvValue({
      rawValue: '[(person, Jane Doe, Author)]',
      context,
      services,
    });

    expect(result.issues).toEqual([]);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      agent_type: AgentType.Person.key,
      agent_id: 'person-1',
      role_id: 'role-1',
      agent_label: 'Jane Doe',
      role_label: 'Author',
      issues: [],
    });
  });

  it('accepts fixed-slot tuples with blanks and leaves missing slots unresolved', async () => {
    const services = createServices({
      queryRole: createQueryMock({
        Author: [{ value: 'role-1', label: 'Author' }],
      }),
    });

    const result = await parseContributionCsvValue({
      rawValue: '[(organization, , Author)]',
      context,
      services,
    });

    expect(result.entries[0]).toMatchObject({
      agent_type: AgentType.Organization.key,
      agent_id: '',
      role_id: 'role-1',
      role_label: 'Author',
      issues: ['Contributor is required for contribution 1.'],
    });
  });

  it('infers a unique contributor from a one-token tuple', async () => {
    const services = createServices({
      queryPerson: createQueryMock({
        'Jane Doe': [{ value: 'person-1', label: 'Jane Doe' }],
      }),
    });

    const result = await parseContributionCsvValue({
      rawValue: '[(Jane Doe)]',
      context,
      services,
    });

    expect(result.entries[0]).toMatchObject({
      agent_type: AgentType.Person.key,
      agent_id: 'person-1',
      agent_label: 'Jane Doe',
      role_id: '',
      issues: ['Role is required for contribution 1.'],
    });
  });

  it('infers a unique role from a one-token tuple', async () => {
    const services = createServices({
      queryRole: createQueryMock({
        Author: [{ value: 'role-1', label: 'Author' }],
      }),
    });

    const result = await parseContributionCsvValue({
      rawValue: '[(Author)]',
      context,
      services,
    });

    expect(result.entries[0]).toMatchObject({
      agent_id: '',
      role_id: 'role-1',
      role_label: 'Author',
      issues: ['Contributor is required for contribution 1.'],
    });
  });

  it('resolves abbreviated two-token tuples when one token is uniquely a contributor and the other a role', async () => {
    const services = createServices({
      queryPerson: createQueryMock({
        'Jane Doe': [{ value: 'person-1', label: 'Jane Doe' }],
      }),
      queryRole: createQueryMock({
        Author: [{ value: 'role-1', label: 'Author' }],
      }),
    });

    const result = await parseContributionCsvValue({
      rawValue: '[(Jane Doe, Author)]',
      context,
      services,
    });

    expect(result.entries[0]).toMatchObject({
      agent_type: AgentType.Person.key,
      agent_id: 'person-1',
      role_id: 'role-1',
      issues: [],
    });
  });

  it('never guesses when a token is ambiguous between contributor and role', async () => {
    const services = createServices({
      queryPerson: createQueryMock({
        Taylor: [{ value: 'person-1', label: 'Taylor' }],
      }),
      queryRole: createQueryMock({
        Taylor: [{ value: 'role-1', label: 'Taylor' }],
      }),
    });

    const result = await parseContributionCsvValue({
      rawValue: '[(Taylor)]',
      context,
      services,
    });

    expect(result.entries[0]).toMatchObject({
      agent_id: '',
      role_id: '',
    });
    expect(result.entries[0]?.issues).toEqual([
      'Contribution 1: token `Taylor` is ambiguous between contributor and role.',
    ]);
  });

  it('reports malformed tuple arrays', async () => {
    const result = await parseContributionCsvValue({
      rawValue: '[(person, Jane Doe, Author]',
      context,
      services: createServices(),
    });

    expect(result.entries).toEqual([]);
    expect(result.issues).toEqual([
      'Contributions must be provided as tuples in the form `[(type, name, role), ...]`.',
    ]);
  });

  it('caches repeated exact-match lookups across tuples in the same upload', async () => {
    const queryPerson = createQueryMock({
      'Jane Doe': [{ value: 'person-1', label: 'Jane Doe' }],
    });
    const queryRole = createQueryMock({
      Author: [{ value: 'role-1', label: 'Author' }],
    });

    await parseContributionCsvValue({
      rawValue: '[(person, Jane Doe, Author), (person, Jane Doe, Author)]',
      context,
      services: createServices({
        queryPerson,
        queryRole,
      }),
    });

    expect(queryPerson).toHaveBeenCalledTimes(1);
    expect(queryRole).toHaveBeenCalledTimes(1);
  });
});
