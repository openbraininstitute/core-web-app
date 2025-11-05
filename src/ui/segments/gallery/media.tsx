'use client';

import { CloseOutlined } from '@ant-design/icons';
import Image from 'next/image';

import { Modal } from '@/ui/molecules/modal';

import type { GalleryContentProps } from '@/api/sanity/gallery/route';

type MediaProps = {
  item: GalleryContentProps;
  isLoaded: boolean;
  onLoad: () => void;
  onOpenModal: () => void;
};

export default function Media({ item, isLoaded, onLoad, onOpenModal }: MediaProps) {
  const { mediaType, image, video, title, brainRegion } = item;
  const mediaUrl = mediaType === 'video' ? video : image;

  if (!mediaUrl) return null;

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onOpenModal}
        aria-label={title || 'Gallery media'}
        className="border-neutral-2 relative mb-3 aspect-square w-full cursor-pointer overflow-hidden rounded-lg border border-solid"
      >
        {!isLoaded && (
          <div
            className="absolute inset-0 animate-pulse bg-gray-200"
            style={{
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        )}
        {mediaType === 'video' ? (
          <video
            src={video || ''}
            className={`h-full w-full object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoadedData={onLoad}
            muted
            playsInline
          >
            <track kind="captions" />
          </video>
        ) : (
          <Image
            src={image || ''}
            alt={title || 'Gallery image'}
            fill
            className={`object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={onLoad}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        )}
      </button>
      <aside className="flex flex-col">
        <div className="text-base font-semibold">{title}</div>
        {brainRegion && (
          <div className="text-sm font-normal capitalize">
            <span className="text-neutral-4">Brain Region:</span> {brainRegion}
          </div>
        )}
        <div className="text-sm font-normal">Copyright OBI – 2025</div>
      </aside>
    </div>
  );
}

type MediaModalProps = {
  open: boolean;
  onClose: () => void;
  item: GalleryContentProps | null;
};

export function MediaModal({ open, onClose, item }: MediaModalProps) {
  if (!item) return null;

  const { mediaType, image, video, title, brainRegion } = item;
  const mediaUrl = mediaType === 'video' ? video : image;

  if (!mediaUrl) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      maskClosable
      closable={false}
      title=""
      position="custom"
      className="!fixed !inset-0 !h-screen !max-h-none !w-screen !max-w-none !translate-x-0 !translate-y-0 !rounded-none !bg-transparent !shadow-none"
      overlayClassName="!bg-black/70"
      bodyClassName="!relative !p-0 !overflow-hidden !h-full !max-h-none !flex !items-center !justify-center !min-h-full"
      headerClassName="!hidden"
      closeIconClassName="!text-white !text-2xl hover:!text-gray-300"
      animation="fade"
      style={{ top: 0, left: 0, transform: 'none', height: '100vh', width: '100vw' }}
    >
      <>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
        >
          <CloseOutlined className="text-xl" />
        </button>
        {mediaType === 'video' ? (
          <video
            src={video || ''}
            controls
            className="h-auto max-h-[calc(100vh-2rem)] w-auto max-w-[calc(100vw-2rem)] object-contain"
            autoPlay
          >
            <track kind="captions" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <Image
            src={image || ''}
            alt={title || 'Gallery image'}
            width={1920}
            height={1080}
            className="h-auto max-h-[calc(100vh-2rem)] w-auto max-w-[calc(100vw-2rem)] object-contain"
            unoptimized
            sizes="100vw"
          />
        )}
        <div className="border-neutral-4 fixed right-4 bottom-4 z-[400] border border-solid p-4 font-sans text-base font-normal text-white">
          <div className="font-bold">{title}</div>
          {brainRegion && (
            <div className="capitalize">
              <span className="text-neutral-3">Brain Region:</span> {brainRegion}
            </div>
          )}
        </div>
      </>
    </Modal>
  );
}
