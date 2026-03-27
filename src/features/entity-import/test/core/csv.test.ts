import { describe, expect, it } from 'vitest';

import {
  type IImportFieldDefinition,
  ImportInputType,
} from '@/features/entity-import/core/contracts';
import {
  buildTemplateColumns,
  importCsvRows,
  parseCsvFile,
} from '@/features/entity-import/core/csv';

const fields: Array<IImportFieldDefinition> = [
  {
    label: 'Name',
    path: 'name',
    required: true,
    inputType: ImportInputType.Text,
  },
  {
    label: 'Species',
    path: 'species',
    required: true,
    inputType: ImportInputType.Select,
  },
  {
    label: 'Brain Region',
    path: 'brainRegion',
    required: true,
    inputType: ImportInputType.RemoteSelect,
    dependencies: ['species'],
    csv: {
      aliases: ['Brain region', 'brain_region'],
    },
  },
];

describe('buildTemplateColumns', () => {
  it('returns the user-facing template headers in field order', () => {
    expect(buildTemplateColumns(fields)).toEqual(['Name', 'Species', 'Brain Region']);
  });
});

describe('importCsvRows', () => {
  it('maps csv columns into field paths and reports stripped columns', () => {
    const result = importCsvRows({
      fields,
      rows: [
        {
          Name: 'Neuron A',
          Species: 'Mouse',
          'Brain region': 'Cortex',
          IgnoreMe: 'x',
        },
      ],
    });

    expect(result.strippedColumns).toEqual(['IgnoreMe']);
    expect(result.rows).toEqual([
      {
        name: 'Neuron A',
        species: 'Mouse',
        brainRegion: 'Cortex',
      },
    ]);
  });

  it('hydrates missing known columns as empty strings so the table stays schema-shaped', () => {
    const result = importCsvRows({
      fields,
      rows: [
        {
          Name: 'Neuron B',
        },
      ],
    });

    expect(result.rows).toEqual([
      {
        name: 'Neuron B',
        species: '',
        brainRegion: '',
      },
    ]);
  });
});

describe('parseCsvFile', () => {
  it('normalizes headers during parse and skips whitespace-only lines', async () => {
    const file = new File(
      [' Name , brain_region \nNeuron A,Cortex\n   \nNeuron B,Cerebellum\n'],
      'entity-import.csv',
      { type: 'text/csv' }
    );

    const result = await parseCsvFile(file);

    expect(result.errors).toEqual([]);
    expect(result.data).toEqual([
      {
        name: 'Neuron A',
        'brain region': 'Cortex',
      },
      {
        name: 'Neuron B',
        'brain region': 'Cerebellum',
      },
    ]);
  });

  it('returns duplicate-header metadata and parser errors when papa parse reports them', async () => {
    const file = new File(['Name,name\nNeuron A,Neuron B,Extra\n'], 'entity-import.csv', {
      type: 'text/csv',
    });

    const result = await parseCsvFile(file);

    expect(result.meta.renamedHeaders).toEqual({
      name_1: 'name',
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'TooManyFields',
          row: 0,
        }),
      ])
    );
  });
});
