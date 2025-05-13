'use client';

import Link from 'next/link';
import { CircuitSchemaProps, DownloadItemProps, FileTypeHeaderProps } from '../../type';
import DownloadItem from './download-item';
import HeaderDownloadModal from './header-download-modal';

import fileTypeDescriptions from '@/components/explore-section/Constant/file-type-descriptions';
import { DownloadIcon } from '@/components/icons';

const [
  CONNECTIVITY_DESCRIPTION,
  MORPHOLOGY_DESCRIPTION,
  NODE_DESCRIPTION,
  EDGE_DESCRIPTION,
]: FileTypeHeaderProps[] = fileTypeDescriptions;

export function FullCircuitItem({ content }: { content: DownloadItemProps }) {
  return (
    <div className="flex w-full flex-row justify-between rounded-lg bg-primary-8 p-8 shadow-xl">
      <div className="w-3/4 hyphens-auto">
        <div className="text-xl font-bold uppercase tracking-wide text-white">
          Download full circuit
        </div>
        <p className="hyphens-auto text-sm font-light leading-normal text-primary-2">
          The complete circuit compressed in SONATA format,
          <a
            href="https://sonata-extension.readthedocs.io/en/latest/"
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
        <div>{content.children?.[0]?.size || 'N/A'}</div>
        <div>h5</div>
        <Link
          href={content.children?.[0]?.url || '#'}
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
  const fullCircuitData = content.files.find(
    (item: DownloadItemProps) => item.fileType === 'fullCircuit'
  );

  return (
    <div className="w-full">
      <HeaderDownloadModal
        handleCloseDownloadModal={handleCloseDownloadModal}
        content={content.files}
      />

      {fullCircuitData ? (
        <FullCircuitItem content={fullCircuitData} />
      ) : (
        <div className="text-primary-2">Full circuit data is not available.</div>
      )}
      <div className="my-8 border-y border-solid border-primary-7 py-4 text-xl font-bold uppercase tracking-wide text-primary-4">
        Download components only
      </div>
      <div className="flex w-full flex-col gap-y-12">
        {content.files
          .filter((item: DownloadItemProps) => item.fileType !== 'fullCircuit')
          .map((item: DownloadItemProps) => {
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
