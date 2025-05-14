'use client';

import { useCallback, useState } from 'react';
import DownloadContainer from '../../global/download/download-container';
import { CircuitSchemaProps } from '../../type';

import ActionButton from './action-button';

import { DownloadIcon, SimulateIcon } from '@/components/icons';
import CloneIcon from '@/components/icons/Clone';
import { classNames } from '@/util/utils';

export default function Heading({ content }: { content: CircuitSchemaProps }) {
  const futureActionsForButton = () => {
    return 'Hello';
  };

  const [downloadModalOpen, SetDownloadModalOpen] = useState<boolean>(false);

  // DOWNLOAD MODAL
  const handleOpenDownloadModal = useCallback(() => {
    SetDownloadModalOpen(true);
  }, []);

  const handleCloseDownloadModal = useCallback(() => {
    SetDownloadModalOpen(false);
  }, []);

  return (
    <>
      <div className="relative flex w-full flex-row justify-between">
        <div className="relative flex flex-col">
          <div className="text-sm uppercase tracking-wider text-gray-500">Name</div>
          <h1 className="text-3xl font-bold text-primary-9">{content.name}</h1>
        </div>

        <div className="flex flex-row gap-x-6 text-primary-9">
          <ActionButton
            type="button"
            label="Simulate"
            action={futureActionsForButton}
            disabled
            link={content.files[0]?.children?.[0]?.url}
          >
            <SimulateIcon iconColor="#002766" className="h-4 w-4 opacity-40" />
          </ActionButton>
          <ActionButton
            type="button"
            label="Clone model"
            action={futureActionsForButton}
            disabled
            link={content.files[0]?.children?.[0]?.url}
          >
            <CloneIcon className="h-4 w-4 text-gray-400" />
          </ActionButton>
          <ActionButton
            type="button"
            label="Save to Library"
            action={futureActionsForButton}
            disabled
            link={content.files[0]?.children?.[0]?.url}
          >
            <DownloadIcon iconColor="#002766" className="h-4 w-4 opacity-40" />
          </ActionButton>
          <ActionButton type="button" label="Download" action={handleOpenDownloadModal}>
            <DownloadIcon iconColor="#002766" className="h-4 w-4" />
          </ActionButton>
        </div>
      </div>

      <div
        className={classNames(
          'out-expo fixed bottom-3 z-[999999] h-screen w-[44vw] overflow-y-scroll bg-primary-9 p-8 transition-right duration-500',
          downloadModalOpen ? 'right-0' : '-right-full'
        )}
      >
        <DownloadContainer content={content} handleCloseDownloadModal={handleCloseDownloadModal} />
      </div>
      <div
        className={classNames(
          'fixed left-0 top-0 z-[999998] h-screen w-screen bg-black transition-opacity duration-500 ease-out-back',
          downloadModalOpen ? 'opacity-50' : 'pointer-events-none opacity-0'
        )}
      />
    </>
  );
}
