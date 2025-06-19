'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import PlaceholderImage from '../img/thumbnail_placeholder.jpg';
import { ContentForTutorialItem } from '../type';

import { classNames } from '@/util/utils';

export default function SingleTutorialCard({ content }: { content: ContentForTutorialItem }) {
  const [isMouseHover, setIsMouseHover] = useState<boolean>(false);

  return (
    <Link
      href={`/app/documentation/tutorials/${content.slug}`}
      className="text-primary-9 relative flex h-44 flex-row gap-x-2 overflow-hidden rounded-lg bg-gray-200 p-4 transition-colors duration-300 ease-in-out hover:bg-white"
      onMouseOver={() => setIsMouseHover(true)}
      onFocus={() => setIsMouseHover(true)}
      onMouseOut={() => setIsMouseHover(false)}
      onBlur={() => setIsMouseHover(false)}
    >
      <div
        className={classNames(
          'relative h-full w-1/2 overflow-hidden shadow-lg transition-all duration-300 ease-in-out',
          isMouseHover ? 'shadow-strongImage rounded-lg' : 'rounded-none'
        )}
      >
        <Image
          width={800}
          height={600}
          src={PlaceholderImage}
          alt={content.title}
          className={classNames(
            'absolute top-0 left-0 h-full w-full object-cover transition-transform duration-300',
            isMouseHover ? 'scale-110' : 'scale-100'
          )}
        />
      </div>
      <div className="w-1/2">
        <h2 className="mb-1 text-xl leading-tight font-bold hyphens-auto">{content.title}</h2>
        <p className="text-base leading-tight font-normal hyphens-auto">{content.description}</p>
      </div>
      <div />
    </Link>
  );
}
