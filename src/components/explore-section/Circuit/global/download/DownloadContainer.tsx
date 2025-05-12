'use client';

import Link from 'next/link';
import { CircuitSchemaProps, DownloadItemProps, FileTypeHeaderProps } from '../../type';
import DownloadItem from './DownloadItem';
import HeaderDownloadModal from './HeaderDownloadModal';

import { DownloadIcon } from '@/components/icons';

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

export function FullCircuitItem() {
  return (
    <div className="mb-8 flex w-full flex-row justify-between border-b border-solid border-primary-7 pb-8">
      <div className="w-3/4 hyphens-auto">
        <div className="text-xl font-bold uppercase tracking-wide text-white">
          Download full circuit
        </div>
        <p className="hyphens-auto text-sm font-light leading-normal text-primary-2">
          The complete circuit compressed in SONATA format,
          <a
            href="https://github.com/AllenInstitute/sonata/blob/master/docs/SONATA_DEVELOPER_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            {' '}
            see more here
          </a>
        </p>
      </div>
      <div className="flex flex-row gap-x-3 font-semibold text-primary-1">
        <div>1.6 TB</div>
        <div>h5</div>
        <Link
          href="/"
          className="flex h-7 w-7 items-center justify-center border border-solid border-primary-6"
          aria-label="Download the full circuit"
        >
          <DownloadIcon iconColor="white" />
        </Link>
      </div>
    </div>
  );
}

export default function DownloadContainer({
  content,
  handleCloseDownloadModal,
}: {
  content: CircuitSchemaProps;
  handleCloseDownloadModal: () => void;
}) {
  return (
    <div className="w-full">
      <HeaderDownloadModal handleCloseDownloadModal={handleCloseDownloadModal} />

      <FullCircuitItem />

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
