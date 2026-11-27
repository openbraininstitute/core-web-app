import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { Profiler, useState } from 'react';
import { describe, expect, it } from 'vitest';

import { createConfigValidator } from '@/features/scan-config/components/hooks';
import Block from '@/features/scan-config/components/ui-blocks/block';
import { fieldIssuesOf } from '@/features/scan-config/issues';
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
  useReportedIssues,
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

describe('what a field shows', () => {
  const NEURON_FILTER_BLOCK = {
    title: 'By property',
    description: '',
    required: ['property_filter'],
    properties: {
      population: { title: 'Population', ui_element: ScanConfigUIElementDict.StringInput },
      property_filter: {
        title: 'Neuron property filter',
        ui_element: ScanConfigUIElementDict.NeuronPropertyFilter,
        population_source_dropdown_key: 'population',
      },
    },
  } as unknown as TBlock;

  function renderBlock(blockSchema: TBlock, entry: Config[string], schemaMappingConfig?: unknown) {
    return render(
      <Providers config={{ info: { campaign_name: 'n' }, neuron_sets: { S: entry } }}>
        <BlockScopeProvider rootElement="neuron_sets" entry="S">
          <Block
            schema={SCHEMA}
            disabled={false}
            blockSchema={blockSchema}
            entity={null}
            schemaMappingConfig={schemaMappingConfig as never}
            rootElement="neuron_sets"
            selectedEntry="S"
            errorPathPrefix="neuron_sets/S"
          />
        </BlockScopeProvider>
      </Providers>
    );
  }

  /** The message the row itself shows; a control's own message (a number out of range) is not it. */
  const visibleTexts = (container: HTMLElement) =>
    [...container.querySelectorAll('[data-testid^="scan-config-field-"] > span.text-red-500')].map(
      (span) => span.textContent
    );

  it('shows Required only under an empty field the block requires', () => {
    const { container } = renderBlock(BY_POPULATION as unknown as TBlock, {
      type: 'ByPopulation',
      gain: null,
    });

    expect(visibleTexts(container)).toEqual(['Required']);
    expect(
      screen.getByTestId('scan-config-field-population').querySelector(':scope > span.text-red-500')
    ).not.toBeNull();
  });

  it('shows no new text under a field with a wrong value', () => {
    const { container } = renderBlock(BY_POPULATION as unknown as TBlock, {
      type: 'ByPopulation',
      population: 'p',
      gain: -1,
    });

    expect(visibleTexts(container)).toEqual([]);
    expect(screen.getByText('must be >= 0')).toHaveClass('sr-only');
  });

  it('shows the no-properties note instead of Required, not both', () => {
    const { container } = renderBlock(
      NEURON_FILTER_BLOCK,
      { type: 'ByProperty', population: 'pop' },
      { properties: { NodePropertyUniqueValuesByPopulation: { pop: {} } } }
    );

    expect(visibleTexts(container)).toEqual(['No properties available']);
    expect(
      screen.getByRole('group', { name: 'Neuron property filter' })
    ).toHaveAccessibleDescription('No properties available');
  });
});

describe('where a field puts its issue', () => {
  function ReportedPaths() {
    return <span data-testid="reported-paths">{[...useReportedIssues().keys()].join(' ')}</span>;
  }

  it('marks a field inside an object field at its own path', () => {
    const objectBlock = {
      title: 'Stimulus',
      description: '',
      properties: {
        shape: {
          title: 'Shape',
          ui_element: ScanConfigUIElementDict.Object,
          properties: {
            width: { title: 'Width', ui_element: ScanConfigUIElementDict.FloatInput },
          },
        },
      },
    } as unknown as TBlock;
    const schema = {
      type: 'object',
      properties: {
        stimulus: {
          type: 'object',
          properties: {
            shape: { type: 'object', properties: { width: { type: 'number', minimum: 0 } } },
          },
        },
      },
    } as unknown as ConfigSchema;
    const store = createScanConfigStore({ stimulus: { shape: { width: -1 } } });
    render(
      <ScanConfigStoreProvider store={store}>
        <ScanConfigErrorsProvider schema={schema}>
          <BlockScopeProvider rootElement="stimulus">
            <Block
              schema={schema}
              disabled={false}
              blockSchema={objectBlock}
              entity={null}
              schemaMappingConfig={undefined}
              rootElement="stimulus"
              errorPathPrefix="stimulus"
            />
          </BlockScopeProvider>
        </ScanConfigErrorsProvider>
      </ScanConfigStoreProvider>
    );

    expect(screen.getByLabelText('Width')).toHaveAttribute('aria-invalid', 'true');
  });

  it('reports the issue of a distribution parameter list at the field, not one level below', () => {
    const block = {
      title: 'Distribution',
      description: '',
      properties: {
        parameters: {
          title: 'Parameters',
          ui_element: ScanConfigUIElementDict.DistributionParameterList,
        },
      },
    } as unknown as TBlock;
    const store = createScanConfigStore({
      distributions: { D: { function: '{a}*{value}', parameters: [] } },
    });
    render(
      <ScanConfigStoreProvider store={store}>
        <ScanConfigErrorsProvider schema={{ type: 'object' } as unknown as ConfigSchema}>
          <BlockScopeProvider rootElement="distributions" entry="D">
            <Block
              schema={SCHEMA}
              disabled={false}
              blockSchema={block}
              entity={null}
              schemaMappingConfig={undefined}
              rootElement="distributions"
              selectedEntry="D"
              errorPathPrefix="distributions/D"
            />
          </BlockScopeProvider>
          <ReportedPaths />
        </ScanConfigErrorsProvider>
      </ScanConfigStoreProvider>
    );

    expect(screen.getByTestId('reported-paths')).toHaveTextContent(
      /^\/distributions\/D\/parameters$/
    );
  });
});
