import type { ReactNode } from 'react';

export type TCircuitContentConfigurationKeys =
  | 'connectivity_metrics'
  | 'nodes'
  | 'edges'
  | 'morphologies'
  | 'configuration_file'
  | 'node_sets_file'
  | 'id_mapping'
  | 'electrical_models'
  | 'mechanisms';

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

export const configurationFileContentConfiguration: CircuitContentConfigurationProps = {
  key: 'configuration_file',
  name: 'Configuration file',
  description: (
    <p className="text-primary-1 w-3/4 text-base font-light">
      SONATA circuit config JSON file.{' '}
      <a
        href="https://sonata-extension.readthedocs.io/en/latest/sonata_config.html"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2"
      >
        See more here
      </a>
      .
    </p>
  ),
  mimeType: 'json',
};

export const nodeSetsFileContentConfiguration: CircuitContentConfigurationProps = {
  key: 'node_sets_file',
  name: 'Node sets file',
  description: (
    <p className="text-primary-1 w-3/4 text-base font-light">
      SONATA node sets JSON file.{' '}
      <a
        href="https://sonata-extension.readthedocs.io/en/latest/sonata_nodeset.html"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2"
      >
        See more here
      </a>
      .
    </p>
  ),
  mimeType: 'json',
};

export const idMappingContentConfiguration: CircuitContentConfigurationProps = {
  key: 'id_mapping',
  name: 'ID mapping',
  description: (
    <p className="text-primary-1 w-3/4 text-base font-light">
      ID mapping JSON file for extracted sub-circuits, containing the original neuron IDs.
    </p>
  ),
  mimeType: 'json',
};

export const electricalModelsContentConfiguration: CircuitContentConfigurationProps = {
  key: 'electrical_models',
  name: 'Electrical models',
  description: (
    <p className="text-primary-1 w-3/4 text-base font-light">
      Electrical neuron model templates (.hoc files), packaged as one archive per directory.{' '}
      <a
        href="https://sonata-extension.readthedocs.io/en/latest/hoc-emodel.html"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2"
      >
        See more here
      </a>
      .
    </p>
  ),
  mimeType: 'tar.gz',
};

export const mechanismsContentConfiguration: CircuitContentConfigurationProps = {
  key: 'mechanisms',
  name: 'Mechanisms',
  description: (
    <p className="text-primary-1 w-3/4 text-base font-light">
      Biophysical mechanism files (.mod), packaged as a single archive.{' '}
      <a
        href="https://sonata-extension.readthedocs.io/en/latest/mod_files.html"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2"
      >
        See more here
      </a>
      .
    </p>
  ),
  mimeType: 'tar.gz',
};

export const networksContentConfiguration: CircuitContentConfigurationProps[] = [
  {
    key: 'nodes',
    name: 'Node files',
    description: (
      <p className="text-primary-1 w-3/4 text-base font-light">
        Files containing information on the population of neurons in the circuit.{' '}
        <a
          href="https://sonata-extension.readthedocs.io/en/latest/sonata_population.html"
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
          href="https://sonata-extension.readthedocs.io/en/latest/sonata_population.html"
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
