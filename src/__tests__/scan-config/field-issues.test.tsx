import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { Profiler, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createConfigValidator } from '@/features/scan-config/components/hooks';
import { IssueList } from '@/features/scan-config/components/issue-list';
import Block from '@/features/scan-config/components/ui-blocks/block';
import { fieldIssuesOf, issueLineOf } from '@/features/scan-config/issues';
import { createScanConfigStore } from '@/features/scan-config/store';
import {
  type Config,
  type ConfigSchema,
  ScanConfigUIElementDict,
  type TBlock,
} from '@/features/scan-config/types';
import {
  BlockScopeProvider,
  ScanConfigErrorsProvider,
  ScanConfigStoreProvider,
  useFieldIssue,
  useReportIssue,
} from '@/features/scan-config/use-config-store';

import type { ReactNode } from 'react';

const BY_ID = {
  title: 'By ID',
  type: 'object',
  properties: {
    type: { const: 'ById' },
    ids: { title: 'Neuron ids', type: 'array', ui_element: ScanConfigUIElementDict.NeuronIds },
  },
  required: ['type', 'ids'],
  additionalProperties: false,
};

const BY_POPULATION = {
  title: 'By population',
  type: 'object',
  properties: {
    type: { const: 'ByPopulation' },
    population: {
      title: 'Population',
      type: 'string',
      ui_element: ScanConfigUIElementDict.StringInput,
    },
    gain: {
      title: 'Gain',
      type: 'number',
      minimum: 0,
      ui_element: ScanConfigUIElementDict.FloatInput,
    },
  },
  required: ['type', 'population'],
  additionalProperties: false,
};

const SCHEMA = {
  type: 'object',
  properties: {
    info: {
      title: 'Info',
      type: 'object',
      ui_element: ScanConfigUIElementDict.BlockSingle,
      properties: {
        campaign_name: {
          title: 'Campaign name',
          type: 'string',
          ui_element: ScanConfigUIElementDict.StringInput,
        },
      },
      required: ['campaign_name'],
    },
    neuron_sets: {
      title: 'Neuron sets',
      type: 'object',
      ui_element: ScanConfigUIElementDict.BlockDictionary,
      additionalProperties: { oneOf: [BY_ID, BY_POPULATION] },
    },
  },
} as unknown as ConfigSchema;

const validate = createConfigValidator(SCHEMA);
const issuesOf = (config: Config) => fieldIssuesOf(validate(config), config);

describe('fieldIssuesOf', () => {
  it('is empty for a valid config', () => {
    expect(issuesOf({ info: { campaign_name: 'n' }, neuron_sets: {} })).toEqual([]);
  });

  it('keeps only the issues of the variant the entry is', () => {
    const issues = issuesOf({
      info: { campaign_name: 'n' },
      neuron_sets: { S: { type: 'ByPopulation' } },
    });

    expect(issues).toEqual([{ path: '/neuron_sets/S/population', message: 'Required' }]);
  });

  it('says Required for an empty value and gives the schema message for a wrong one', () => {
    const issues = issuesOf({
      info: { campaign_name: null },
      neuron_sets: { S: { type: 'ByPopulation', population: 'p', gain: -1 } },
    });

    expect(issues).toEqual([
      { path: '/info/campaign_name', message: 'Required' },
      { path: '/neuron_sets/S/gain', message: 'must be >= 0' },
    ]);
  });

  it('gives one issue at the entry when it matches no variant', () => {
    const issues = issuesOf({
      info: { campaign_name: 'n' },
      neuron_sets: { S: { type: 'Other' } },
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe('/neuron_sets/S');
  });
});

describe('issueLineOf', () => {
  const nested = {
    properties: {
      mechanisms: {
        title: 'Mechanisms',
        properties: {
          selection: {
            title: 'Selection',
            properties: { models: { title: 'Ion channel models' }, untitled: {} },
          },
        },
      },
    },
  } as unknown as ConfigSchema;

  it('names an issue below a field by the deepest title on its path', () => {
    const line = issueLineOf(nested, {}, { path: '/mechanisms/selection/models', message: 'm' });

    expect(line.title).toBe('Mechanisms: Ion channel models');
    expect(line.field).toBe('selection');
  });

  it('keeps the last title it finds when a deeper part has none', () => {
    const line = issueLineOf(
      nested,
      {},
      { path: '/mechanisms/selection/untitled/0', message: 'm' }
    );

    expect(line.title).toBe('Mechanisms: Selection');
  });
});

function Providers({ config, children }: { config: Config; children: ReactNode }) {
  const [store] = useState(() => createScanConfigStore(config));
  return (
    <ScanConfigStoreProvider store={store}>
      <ScanConfigErrorsProvider schema={SCHEMA}>{children}</ScanConfigErrorsProvider>
    </ScanConfigStoreProvider>
  );
}

describe('useFieldIssue', () => {
  function setup(config: Config) {
    const store = createScanConfigStore(config);
    const commits = { count: 0 };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ScanConfigStoreProvider store={store}>
        <ScanConfigErrorsProvider schema={SCHEMA}>
          <Profiler
            id="reader"
            onRender={() => {
              commits.count += 1;
            }}
          >
            {children}
          </Profiler>
        </ScanConfigErrorsProvider>
      </ScanConfigStoreProvider>
    );

    return { store, commits, wrapper };
  }

  it('gives the message of the field and nothing for a valid field', () => {
    const { wrapper } = setup({ info: { campaign_name: null }, neuron_sets: {} });

    expect(renderHook(() => useFieldIssue('/info/campaign_name'), { wrapper }).result.current).toBe(
      'Required'
    );
    expect(
      renderHook(() => useFieldIssue('/neuron_sets'), { wrapper }).result.current
    ).toBeUndefined();
  });

  it('does not re-render while issues change at another field', () => {
    const { store, commits, wrapper } = setup({ info: { campaign_name: 'n' }, neuron_sets: {} });
    renderHook(() => useFieldIssue('/info/campaign_name'), { wrapper });
    const before = commits.count;

    act(() =>
      store.set((previous) => ({ ...previous, neuron_sets: { S: { type: 'ByPopulation' } } }))
    );

    expect(commits.count).toBe(before);
  });
});

describe('Block with an issue', () => {
  function renderEntry() {
    const config = {
      info: { campaign_name: 'n' },
      neuron_sets: { S: { type: 'ByPopulation', gain: -1 }, T: { type: 'ById' } },
    };
    return render(
      <Providers config={config}>
        <BlockScopeProvider rootElement="neuron_sets" entry="S">
          <Block
            schema={SCHEMA}
            disabled={false}
            blockSchema={BY_POPULATION as unknown as TBlock}
            entity={null}
            schemaMappingConfig={undefined}
            rootElement="neuron_sets"
            selectedEntry="S"
            errorPathPrefix="neuron_sets/S"
          />
        </BlockScopeProvider>
        <BlockScopeProvider rootElement="neuron_sets" entry="T">
          <Block
            schema={SCHEMA}
            disabled={false}
            blockSchema={BY_ID as unknown as TBlock}
            entity={null}
            schemaMappingConfig={undefined}
            rootElement="neuron_sets"
            selectedEntry="T"
            errorPathPrefix="neuron_sets/T"
          />
        </BlockScopeProvider>
      </Providers>
    );
  }

  it('marks a one-control field invalid and describes it with its message', () => {
    renderEntry();

    const gain = screen.getByLabelText('Gain');
    expect(gain).toHaveAttribute('aria-invalid', 'true');
    expect(gain).toHaveAccessibleDescription('must be >= 0');
    expect(screen.getByLabelText('Population')).toHaveAccessibleDescription('Required');
  });

  it('describes a group field with its message', () => {
    renderEntry();

    expect(screen.getByRole('group', { name: 'Neuron ids' })).toHaveAccessibleDescription(
      'Required'
    );
  });

  it('clears the mark when the value is fixed', () => {
    renderEntry();

    fireEvent.change(screen.getByLabelText('Population'), { target: { value: 'p' } });

    expect(screen.getByLabelText('Population')).not.toHaveAttribute('aria-invalid');
  });
});

describe('IssueList', () => {
  const config = {
    info: { campaign_name: null },
    neuron_sets: { S: { type: 'ByPopulation', population: 'p', gain: -1 } },
  };

  it('lists each issue with its section, entry and field title', () => {
    render(
      <Providers config={config}>
        <IssueList schema={SCHEMA} onOpen={vi.fn()} />
      </Providers>
    );

    const lines = screen.getAllByRole('listitem').map((line) => line.textContent);
    expect(lines).toEqual(['Info: Campaign name. Required', 'Neuron sets, S: Gain. must be >= 0']);
  });

  it('opens the section and entry of the issue that is clicked', () => {
    const onOpen = vi.fn();
    render(
      <Providers config={config}>
        <IssueList schema={SCHEMA} onOpen={onOpen} />
      </Providers>
    );

    fireEvent.click(screen.getByRole('button', { name: /Gain/ }));

    expect(onOpen).toHaveBeenCalledWith({ rootElement: 'neuron_sets', entry: 'S', field: 'gain' });
  });

  it('lists an issue reported by a field too', () => {
    function Reporter() {
      useReportIssue('/info/campaign_name', 'taken');
      return null;
    }
    render(
      <Providers config={{ info: { campaign_name: 'n' }, neuron_sets: {} }}>
        <Reporter />
        <IssueList schema={SCHEMA} onOpen={vi.fn()} />
      </Providers>
    );

    expect(screen.getByRole('listitem')).toHaveTextContent('Info: Campaign name. taken');
  });

  it('renders nothing without issues', () => {
    const { container } = render(
      <Providers config={{ info: { campaign_name: 'n' }, neuron_sets: {} }}>
        <IssueList schema={SCHEMA} onOpen={vi.fn()} />
      </Providers>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
