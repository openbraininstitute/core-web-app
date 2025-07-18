'use client';

import { useCallback, useState } from 'react';
import Confetti from 'react-confetti';

import DownloadContainer from '../../global/download/download-container';
import { CircuitSchemaProps } from '../../type';

import ActionButton from './action-button';

import { DownloadIcon } from '@/components/icons';
import CloneIcon from '@/components/icons/Clone';
import { classNames } from '@/util/utils';

export default function Heading({ content }: { content: CircuitSchemaProps }) {
  const [downloadModalOpen, SetDownloadModalOpen] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  // DOWNLOAD MODAL
  const handleOpenDownloadModal = useCallback(() => {
    SetDownloadModalOpen(true);
  }, []);

  const handleCloseDownloadModal = useCallback(() => {
    SetDownloadModalOpen(false);
  }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content.entityCoreID || content.key || '');
      setShowConfetti(true);
      setShowMessage(true);
      setTimeout(() => {
        setShowConfetti(false);
        setShowMessage(false);
      }, 3500);
    } catch (err) {
      throw new Error('Failed to copy to clipboard');
    }
  };

  return (
    <>
      <div className="relative flex w-full flex-row justify-between">
        <div className="relative flex flex-col">
          <div className="text-sm tracking-wider text-gray-500 uppercase">Name</div>
          <h1 className="text-primary-9 text-3xl font-bold">{content.name}</h1>
        </div>

        {showMessage && (
          <div className="fixed top-0 left-0 z-[999999] flex w-full justify-center text-white">
            <p className="bg-green-600 px-10 py-4 whitespace-nowrap">Id copied to the clipboard</p>
          </div>
        )}
        {showConfetti && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 9999,
            }}
          >
            <Confetti
              width={window.innerWidth}
              height={window.innerHeight}
              recycle={false}
              numberOfPieces={200}
              tweenDuration={4000}
              initialVelocityY={40}
            />
          </div>
        )}

        <div className="text-primary-9 relative flex flex-row gap-x-6">
          {/* <ActionButton
            type="button"
            label="Simulate"
            action={futureActionsForButton}
            disabled
            link={content.files[0]?.children?.[0]?.url}
          >
            <SimulateIcon iconColor="#002766" className="h-4 w-4 opacity-40" />
          </ActionButton> */}
          {/* <ActionButton
            type="button"
            label="Clone model"
            action={futureActionsForButton}
            disabled
            link={content.files[0]?.children?.[0]?.url}
            >
            <CloneIcon className="h-4 w-4 text-gray-400" />
            </ActionButton> */}
          {/* <ActionButton
            type="button"
            label="Save to Library"
            action={futureActionsForButton}
            disabled
            link={content.files[0]?.children?.[0]?.url}
            >
            <DownloadIcon iconColor="#002766" className="h-4 w-4 opacity-40" />
            </ActionButton> */}

          {content.key !== null && (
            <ActionButton
              type="button"
              label="Copy ID"
              action={copyToClipboard}
              link={content.files[0]?.children?.[0]?.url}
              disabled={content.entityCoreID === null || content.key === null}
            >
              <CloneIcon className="h-4 w-4 text-gray-400" />
            </ActionButton>
          )}
          <ActionButton type="button" label="Download" action={handleOpenDownloadModal}>
            <DownloadIcon className="text-primary-9 h-4 w-4" />
          </ActionButton>
        </div>
      </div>

      <div
        className={classNames(
          'out-expo bg-primary-9 transition-right fixed bottom-3 z-100 h-screen w-[44vw] overflow-y-scroll p-8 duration-500',
          downloadModalOpen ? 'right-[40px]' : '-right-full'
        )}
      >
        <DownloadContainer content={content} handleCloseDownloadModal={handleCloseDownloadModal} />
      </div>
      <div
        className={classNames(
          'ease-out-back fixed top-0 left-0 z-80 h-screen w-screen bg-black transition-opacity duration-500',
          downloadModalOpen ? 'opacity-50' : 'pointer-events-none opacity-0'
        )}
      />
    </>
  );
}
