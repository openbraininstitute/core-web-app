import { CloseOutlined } from '@ant-design/icons';
import Image from 'next/image';

import { GalleryContentProps } from '@/services/sanity';
import { Modal } from '@/ui/molecules/modal';

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
      <button
        type="button"
        onClick={onClose}
        aria-label="Close modal"
        className="absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
      >
        <CloseOutlined className="text-xl" />
      </button>
      <div
        className="flex items-center justify-center"
        style={{
          backgroundColor:
            item.has_background && item.backgroundColor ? item.backgroundColor : undefined,
          padding: '1rem',
          borderRadius: '0.5rem',
        }}
      >
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
      </div>
      <div className="fixed right-4 bottom-4 z-[400] bg-black/70 px-5 py-4 font-sans text-base font-normal text-white">
        <div className="font-bold">{title}</div>
        {brainRegion && (
          <div className="capitalize">
            <span className="text-neutral-3">Brain Region:</span> {brainRegion}
          </div>
        )}
      </div>
    </Modal>
  );
}
