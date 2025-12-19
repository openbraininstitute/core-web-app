'use client';

import Image from 'next/image';

import type { GalleryContentProps } from '@/api/sanity/gallery/route';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { cn } from '@/utils/css-class';

type MediaProps = {
  item: GalleryContentProps;
  isLoaded: boolean;
  onLoad: () => void;
  onOpenModal: () => void;
};

export default function Media({ item, isLoaded, onLoad, onOpenModal }: MediaProps) {
  const { mediaType, image, video, title, brainRegion } = item;
  const mediaUrl = mediaType === 'video' ? video : image;
  const breakpoint = useDefaultBreakpoint();
  const isDesktop = breakpoint === 'l' || breakpoint === 'xl';

  if (!mediaUrl) return null;

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onOpenModal}
        aria-label={title || 'Gallery media'}
        className="border-neutral-2 relative mb-3 aspect-square w-full cursor-pointer overflow-hidden rounded-lg border border-solid"
        style={{
          backgroundColor:
            item.has_background && item.backgroundColor ? item.backgroundColor : undefined,
        }}
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
            className={cn(
              'object-cover transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0',
            )}
            onLoad={onLoad}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        )}
      </button>
      <aside className="flex flex-col">
        <div
          className="text-base font-semibold"
          style={
            !isDesktop && title && title.length > 22
              ? {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }
              : undefined
          }
          title={!isDesktop && title && title.length > 22 ? title : undefined}
        >
          {!isDesktop && title && title.length > 22 ? `${title.substring(0, 22)}...` : title}
        </div>
        {brainRegion && (
          <div className="text-sm font-normal capitalize">
            <span className="text-neutral-4">Brain Region:</span> {brainRegion}
          </div>
        )}
        {isDesktop && <div className="text-sm font-normal">Copyright OBI – 2025</div>}
      </aside>
    </div>
  );
}
