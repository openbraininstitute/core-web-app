'use client';

import { VideoCameraOutlined } from '@ant-design/icons';
import { RiPlayFill } from '@remixicon/react';
import { lowerCase, upperFirst } from 'es-toolkit/compat';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { cn } from '@/utils/css-class';

import type { TTutorial } from '@/ui/segments/project/get-started/query';

// Captures a screenshot of the tutorial video (frame at 0.5s) and renders it as
// the card image. Falls back to the Sanity poster while loading / on failure.
function VideoScreenshot({
  videoUrl,
  fallback,
  alt,
  className,
}: {
  videoUrl: string;
  fallback: string;
  alt: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);

  useEffect(() => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = videoUrl;
    videoRef.current = video;

    let cancelled = false;

    const handleLoadedData = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setSnapshot(canvas.toDataURL('image/jpeg', 0.85));
      } catch {
        // CORS / codec issue — stay on fallback.
      }
    };
    const handleLoadedMetadata = () => {
      try {
        video.currentTime = Math.min(2, (video.duration || 4) / 2);
      } catch {
        /* ignore */
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('seeked', handleLoadedData);

    return () => {
      cancelled = true;
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('seeked', handleLoadedData);
      video.src = '';
    };
  }, [videoUrl]);

  const src = snapshot ?? fallback;
  return (
    <Image
      fill
      unoptimized
      alt={alt}
      src={src}
      className={cn('object-cover transition-all ease-in-out', className)}
    />
  );
}

export function TutorialCard({
  title,
  slug,
  image,
  videoUrl,
  isSelected,
}: {
  isSelected: boolean;
  title: string;
  slug: string;
  image: string;
  videoUrl: string;
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const t = upperFirst(lowerCase(title));
  return (
    <Link
      href={`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/tutorials/${slug}`}
      className="flex w-full"
    >
      <div
        className={cn(
          'relative aspect-video w-full overflow-hidden rounded-xl cursor-pointer group select-none',
          'shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)] hover:shadow-bnb',
          'border-2 transition-colors',
          isSelected ? 'border-primary-7' : 'border-transparent'
        )}
        title={t}
      >
        <VideoScreenshot videoUrl={videoUrl} fallback={image} alt={t} />
        <div className="absolute bottom-2 right-2">
          <RiPlayFill className="text-white size-8 drop-shadow-md" />
        </div>
      </div>
    </Link>
  );
}

export function TutorialGrid({ tutorials }: { tutorials: Array<TTutorial> }) {
  const { slug } = useParams<{ slug: string }>();

  return (
    <section id="tutorials-list" className="w-full flex flex-col">
      <h2 className="text-primary-9 text-lg font-bold px-2 mb-2">Tutorials</h2>
      <div className="flex w-full gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tutorials.map((p) => (
          <div key={p.url} className="w-60 shrink-0 flex">
            <TutorialCard
              title={p.title}
              image={p.poster}
              videoUrl={p.url}
              slug={p.slug}
              isSelected={slug === p.slug}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export function EmptyTutorials() {
  return (
    <section id="discover-tutorials" className="w-full flex flex-col my-6">
      <h2 className="font-medium text-primary-9 px-2 mb-4">Discover</h2>
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-xl bg-white shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)]">
        <div className="flex items-center justify-center size-16 rounded-full bg-primary-8 mb-5">
          <VideoCameraOutlined className="text-white! text-2xl" />
        </div>
        <h3 className="text-primary-8 text-lg font-semibold mb-1.5">No tutorials available yet</h3>
        <p className="text-neutral-4 text-sm max-w-sm leading-relaxed">
          Video guides and walkthroughs will appear here as they are published. Stay tuned for new
          content to help you get the most out of the platform.
        </p>
      </div>
    </section>
  );
}
