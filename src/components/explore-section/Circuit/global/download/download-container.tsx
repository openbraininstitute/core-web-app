'use client';

import { Tooltip } from 'antd';
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

function FullCircuitItem({ content }: { content: DownloadItemProps }) {
  return (
    <div className="bg-primary-8 flex w-full flex-row justify-between rounded-lg p-8 shadow-xl">
      <div className="w-3/4 hyphens-auto">
        <div className="text-xl font-bold tracking-wide text-white uppercase">
          Download full circuit
        </div>
        <p className="text-primary-2 text-sm leading-normal font-light hyphens-auto">
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
      <div
        className="text-primary-1 flex flex-row gap-x-3 font-semibold"
        title={content.children?.[0]?.name}
      >
        <div>{content.children?.[0]?.size || ''}</div>
        <div>{content.children?.[0]?.extension ?? ''}</div>
        <Link
          href={content.children?.[0]?.url || '#'}
          className="border-primary-6 flex h-7 w-7 items-center justify-center border border-solid"
          aria-label="Download the full circuit"
        >
          <DownloadIcon className="text-white" />
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
    <div className="relative w-full">
      <HeaderDownloadModal
        handleCloseDownloadModal={handleCloseDownloadModal}
        content={content.files}
      />

      {fullCircuitData ? (
        <FullCircuitItem content={fullCircuitData} />
      ) : (
        <div className="text-primary-2">Full circuit data is not available.</div>
      )}
      <div className="border-primary-7 text-primary-4 my-8 border-y border-solid py-4 text-xl font-bold tracking-wide uppercase">
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

            return item.fileType === 'morphology' ? (
              <Tooltip title="Coming soon" key={item.fileType}>
                <DownloadItem
                  key={item.fileType}
                  item={item}
                  header={headerType || { name: '', description: '', extension: '' }}
                  className={
                    content.scale === 'Small Circuit'
                      ? 'pointer-events-none opacity-30'
                      : 'pointer-events-auto opacity-100'
                  }
                />
              </Tooltip>
            ) : (
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
