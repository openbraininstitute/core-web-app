import type { ReactNode } from 'react';

export type TCircuitContentConfigurationKeys =
  | 'connectivity_metrics'
  | 'nodes'
  | 'edges'
  | 'morphologies';

type CircuitContentConfigurationProps = {
  key: TCircuitContentConfigurationKeys;
  name: string;
  description: ReactNode;
  mimeType: string;
};

export const connectivityMetricsContentConfiguration: CircuitContentConfigurationProps = {
  key: 'connectivity_metrics',
  name: 'Connectivity Matrices',
  description: (
    <p className="text-primary-1 w-3/4 text-base font-light">
      The connectome, sparse connectivity matrix and node properties in Connectome Utilities format.{' '}
      <a
        href="https://github.com/openbraininstitute/ConnectomeUtilities/blob/main/README.md"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2"
      >
        See more here
      </a>
      .
    </p>
  ),
  mimeType: 'h5',
};

export const morphologiesContentConfiguration: CircuitContentConfigurationProps = {
  key: 'morphologies',
  name: 'Morphologies',
  description: (
    <p className="text-primary-1 w-3/4 text-base font-light">
      The neuronal morphologies used in the circuit grouped in h5 containers.{' '}
      <a
        href="https://morphio.readthedocs.io/en/latest/python.html"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2"
      >
        See more here
      </a>
      .
    </p>
  ),
  mimeType: 'h5',
};

export const networksContentConfiguration: CircuitContentConfigurationProps[] = [
  {
    key: 'nodes',
    name: 'Node files',
    description: (
      <p className="text-primary-1 w-3/4 text-base font-light">
        Files containing information on the population of neurons in the circuit.{' '}
        <a
          href="https://github.com/AllenInstitute/sonata/blob/master/docs/SONATA_DEVELOPER_GUIDE.md#neuron_networks_nodes"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          See more here
        </a>
        .
      </p>
    ),
    mimeType: 'h5',
  },
  {
    key: 'edges',
    name: 'Edge files',
    description: (
      <p className="text-primary-1 w-3/4 text-base font-light">
        Files containing information on the connections between neurons in the circuit.{' '}
        <a
          href="https://github.com/AllenInstitute/sonata/blob/master/docs/SONATA_DEVELOPER_GUIDE.md#neuron_networks_edges"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          See more here
        </a>
        .
      </p>
    ),
    mimeType: 'h5',
  },
];
