'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { classNames } from '@/util/utils';

import PlaceholderImage from '../img/thumbnail_placeholder.jpg';

import type { TutorialProps } from '../type';

export default function SingleTutorialCard({ content }: { content: TutorialProps }) {
  const [isMouseHover, setIsMouseHover] = useState<boolean>(false);

  return (
    <Link
      href={`/app/documentation/tutorials/${content.slug}`}
      className="text-primary-8 hover:text-primary-9 relative flex h-44 flex-row gap-x-2 overflow-hidden rounded-lg bg-gray-200 p-4 transition-colors duration-300 ease-in-out hover:bg-white"
      onMouseOver={() => setIsMouseHover(true)}
      onFocus={() => setIsMouseHover(true)}
      onMouseOut={() => setIsMouseHover(false)}
      onBlur={() => setIsMouseHover(false)}
    >
      <div
        className={classNames(
          'relative h-full w-1/2 overflow-hidden shadow-lg transition-all duration-500 ease-in-out',
          isMouseHover ? 'shadow-strongImage rounded-full' : 'rounded-none'
        )}
        style={{
          borderRadius: isMouseHover ? '22px' : '0',
          boxShadow: isMouseHover
            ? '0 4px 20px rgba(0, 0, 0, 0.25)'
            : '0 4px 20px rgba(0, 0, 0, 0)',
        }}
      >
        <Image
          width={800}
          height={600}
          src={content.imageURL || PlaceholderImage}
          alt={content.title || 'Tutorial image'}
          className="absolute top-0 left-0 h-full w-full object-cover transition-all duration-300"
          style={{
            transform: isMouseHover ? 'scale(1.1) rotate(3deg)' : 'scale(1) rotate(0deg)',
          }}
        />
      </div>
      <div className="w-1/2">
        <h2 className="mb-1 text-xl leading-[1.15] font-bold hyphens-auto">{content.title}</h2>
        <p className="line-clamp-3 text-base leading-tight font-normal hyphens-auto">
          {content.description}
        </p>
      </div>
      <div />
    </Link>
  );
}
