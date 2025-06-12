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
      className="relative flex h-44 flex-row gap-x-2 overflow-hidden rounded-lg bg-gray-200 p-4 text-primary-9 transition-colors duration-300 ease-in-out hover:bg-white"
      onMouseOver={() => setIsMouseHover(true)}
      onFocus={() => setIsMouseHover(true)}
      onMouseOut={() => setIsMouseHover(false)}
      onBlur={() => setIsMouseHover(false)}
    >
      <div
        className={classNames(
          'relative h-full w-1/2 overflow-hidden shadow-lg transition-all duration-300 ease-in-out',
          isMouseHover ? 'rounded-lg shadow-strongImage' : 'rounded-none'
        )}
      >
        <Image
          width={800}
          height={600}
          src={PlaceholderImage}
          alt={content.title}
          className={classNames(
            'absolute left-0 top-0 h-full w-full object-cover transition-transform duration-300',
            isMouseHover ? 'scale-110' : 'scale-100'
          )}
        />
      </div>
      <div className="w-1/2">
        <h2 className="mb-1 hyphens-auto text-xl font-bold leading-tight">{content.title}</h2>
        <p className="hyphens-auto text-base font-normal leading-tight">{content.description}</p>
      </div>
      <div />
    </Link>
  );
}
