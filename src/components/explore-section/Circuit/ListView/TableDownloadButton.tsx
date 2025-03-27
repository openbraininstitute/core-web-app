'use client';

import Link from 'next/link';

import { InformationIcon } from '@/components/icons';

export function TableDownloadButtonLight({
  handleFileDownload,
  selectedRowKeys,
}: {
  handleFileDownload: (fileType: string) => void;
  selectedRowKeys: string[];
}) {
  return (
    <div
      className="fixed bottom-6 right-24 z-50 flex h-16 w-[400px] flex-row items-center justify-between bg-primary-8 pl-8 transition-bottom duration-300 ease-in-out"
      style={{
        bottom: selectedRowKeys.length > 0 ? '24px' : '-60px',
      }}
    >
      <div className="relative flex flex-row gap-x-3 text-base font-normal">
        <span className="block text-primary-3">Download ({selectedRowKeys.length})</span>
        <Link
          href="https://github.com/openbraininstitute/ConnectomeUtilities/blob/main/README.md"
          target="_blank"
          className="relative top-1 h-5 w-5"
        >
          <InformationIcon iconColor="white" className="h-4 w-auto" />
        </Link>
      </div>
      <div className="relative flex h-full flex-row">
        <button
          type="button"
          aria-label="Download connectome utilities"
          className="bg-primary-8 px-5 text-base font-normal text-white transition-colors duration-300 ease-in hover:bg-primary-1 hover:text-primary-8"
          onClick={() => handleFileDownload('connectomeUtilitiesFile')}
        >
          Connectome utilities
        </button>
      </div>
    </div>
  );
}

export function TableDownloadButtonFull({
  handleFileDownload,
  selectedRowKeys,
}: {
  handleFileDownload: (fileType: string) => void;
  selectedRowKeys: string[];
}) {
  return (
    <div
      className="fixed bottom-6 right-24 z-50 flex h-16 w-[400px] flex-row items-center justify-between bg-primary-8 pl-8 transition-bottom duration-300 ease-in-out"
      style={{
        bottom: selectedRowKeys.length > 0 ? '24px' : '-60px',
      }}
    >
      <div className="text-base font-normal text-primary-3">
        Download ({selectedRowKeys.length})
      </div>
      <div className="relative flex h-full flex-row">
        <button
          type="button"
          aria-label="Download sonata circuit"
          className="bg-primary-8 px-5 text-base font-normal text-white transition-colors duration-300 ease-in hover:bg-primary-1 hover:text-primary-8"
          onClick={() => handleFileDownload('sonataFile')}
        >
          Sonata
        </button>
        <button
          type="button"
          aria-label="Download connectome utilities"
          className="bg-primary-8 px-5 text-base font-normal text-white transition-colors duration-300 ease-in hover:bg-primary-1 hover:text-primary-8"
          onClick={() => handleFileDownload('connectomeUtilitiesFile')}
        >
          Connectome utilities
        </button>
      </div>
    </div>
  );
}
