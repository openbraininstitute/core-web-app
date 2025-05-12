'use client';

import { CircuitSchemaProps, DownloadItemProps, FileTypeHeaderProps } from '../../type';
import DownloadItem from './DownloadItem';

import HeaderDownloadModal from './HeaderDownloadModal';

const [
  CONNECTIVITY_DESCRIPTION,
  MORPHOLOGY_DESCRIPTION,
  NODE_DESCRIPTION,
  EDGE_DESCRIPTION,
]: FileTypeHeaderProps[] = [
  {
    name: 'Connectivity Matrices',
    description: (
      <p className="w-3/4 text-base font-light text-primary-1">
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
    name: 'Morphology',
    description: (
      <p className="w-3/4 text-base font-light text-primary-1">
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
      <p className="w-3/4 text-base font-light text-primary-1">
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
      <p className="w-3/4 text-base font-light text-primary-1">
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

export default function DownloadContainer({
  content,
  handleCloseDownloadModal,
  downloadModalOpen,
}: {
  content: CircuitSchemaProps;
  handleCloseDownloadModal: () => void;
  downloadModalOpen: boolean;
}) {
  // const [totalFileSize, setTotalFileSize] = useState<number>(0);
  // const [selectedFiles, setSelectedFiles] = useState<object[] | null>(null);

  return (
    <div
      className="fixed bottom-3 z-[999999] flex h-screen w-[44vw] flex-col overflow-y-scroll bg-primary-9 p-8 transition-right duration-300 ease-out-back"
      style={{
        right: downloadModalOpen ? '0' : '-20vw',
      }}
    >
      <HeaderDownloadModal handleCloseDownloadModal={handleCloseDownloadModal} />

      <div className="flex w-full flex-col gap-y-12">
        {content.files.map((item: DownloadItemProps) => {
          let headerType: FileTypeHeaderProps | null = null;

          if (item.fileType === 'connectivityMatrix') {
            headerType = CONNECTIVITY_DESCRIPTION;
          } else if (item.fileType === 'morphology') {
            headerType = MORPHOLOGY_DESCRIPTION;
          } else if (item.fileType === 'nodes') {
            headerType = NODE_DESCRIPTION;
          } else if (item.fileType === 'edges') {
            headerType = EDGE_DESCRIPTION;
          }

          return (
            <DownloadItem
              key={item.fileType}
              item={item}
              header={headerType || { name: '', description: '', extension: '' }}
            />
          );
        })}
      </div>
    </div>
  );
}
