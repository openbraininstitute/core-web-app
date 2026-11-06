import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ViewVariant } from '@/constants';
import { JsonView } from '@/ui/segments/detail-view/json-view';

import type { Json } from '@/ui/segments/detail-view/json-view';

// a circuit extraction coordinate config, as stored in its task_config asset
const config: Json = {
  obi_one_version: '2026.7.13.post1.dev25',
  type: 'CircuitExtractionSingleConfig',
  idx: 0,
  info: { type: 'Info', campaign_name: '10-Neuron-Extraction' },
  initialize: {
    circuit: { id_str: 'f5894718', type: 'CircuitFromID' },
    do_virtual: true,
  },
  neuron_sets: {
    Custom: {
      sample_percentage: 100.0,
      neuron_ids: { name: 'Custom', elements: [0, 1, 2] },
    },
  },
  scan_params: [],
  optional: null,
};

function section(name: string) {
  return screen.getByRole('heading', { name }).closest('section') as HTMLElement;
}

describe('JsonView', () => {
  it('shows top-level leaves, technical keys included, verbatim', () => {
    render(<JsonView value={config} variant={ViewVariant.Default} />);

    expect(screen.getByText('obi_one_version')).toBeInTheDocument();
    expect(screen.getByText('2026.7.13.post1.dev25')).toBeInTheDocument();
    expect(screen.getByText('idx')).toBeInTheDocument();
  });

  it('renders objects as sections titled by their key, nested as deep as the JSON', () => {
    render(<JsonView value={config} variant={ViewVariant.Default} />);

    expect(section('neuron_sets')).toContainElement(section('Custom'));
    expect(section('Custom')).toContainElement(section('neuron_ids'));
    expect(within(section('neuron_ids')).getByText('0, 1, 2')).toBeInTheDocument();
    expect(within(section('circuit')).getByText('CircuitFromID')).toBeInTheDocument();
  });

  it('prints booleans, nulls and empty arrays as JSON would', () => {
    render(<JsonView value={config} variant={ViewVariant.Default} />);

    expect(within(section('initialize')).getByText('true')).toBeInTheDocument();
    expect(screen.getByText('null')).toBeInTheDocument();
    expect(screen.getByText('[]')).toBeInTheDocument();
  });

  it('titles the objects of an array by their index', () => {
    render(
      <JsonView value={{ groups: [{ name: 'a' }, { name: 'b' }] }} variant={ViewVariant.Light} />
    );

    expect(within(section('1')).getByText('b')).toBeInTheDocument();
  });
});
