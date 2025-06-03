export type FileTypeHeaderProps = {
  name: string;
  description: React.ReactNode;
  extension: string;
};

const fileTypeDescriptions: FileTypeHeaderProps[] = [
  {
    name: 'Connectivity Matrices',
    description: (
      <p className="text-primary-1 w-3/4 text-base font-light">
        The connectome, sparse connectivity matrix and node properties in Connectome Utilities
        format.{' '}
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
    extension: 'h5',
  },
  {
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
    extension: 'h5',
  },
  {
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
    extension: 'h5',
  },
  {
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
    extension: 'h5',
  },
];

export default fileTypeDescriptions;
