'use client';

import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import PlaceholderImage from '@/ui/segments/help/tutorials/thumbnail_placeholder.webp';

import type { TutorialProps } from '@/components/documentation/type';

export default function TutorialCard({ content }: { content: TutorialProps }) {
  const [mouseHover, setMouseHover] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleClick = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tutorial', content.slug);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="shadow-skm-l hover:bg-neutral-1 flex w-full flex-col overflow-hidden rounded-lg bg-white p-6 text-left transition-colors duration-500 ease-in-out"
      onMouseOver={() => setMouseHover(true)}
      onFocus={() => setMouseHover(true)}
      onMouseOut={() => setMouseHover(false)}
      onBlur={() => setMouseHover(false)}
      aria-label={`View ${content.title || 'tutorial'}`}
    >
      <div className="relative h-44 w-full overflow-hidden rounded-lg shadow-lg">
        <Image
          width={800}
          height={600}
          src={content.imageURL || PlaceholderImage}
          alt={content.title || 'Tutorial image'}
          className="h-full w-full scale-105 object-cover transition-all duration-300 ease-in-out"
          style={{
            transform: mouseHover ? 'scale(1.05) rotate(2deg)' : 'scale(1) rotate(0deg)',
          }}
        />
      </div>
      <div className="text-primary-9 mt-3 w-full">
        <h2 className="mb-1 text-2xl leading-[1.15] font-bold hyphens-auto">{content.title}</h2>
        <p className="line-clamp-3 text-base leading-normal font-normal hyphens-auto">
          {content.description}
        </p>
      </div>
      <div />
    </button>
  );
}
