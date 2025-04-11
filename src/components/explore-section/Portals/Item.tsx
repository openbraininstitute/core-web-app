'use client';

import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import TextContent from './TextContent';
import { Portal } from '@/types/explore-portal';
import { ArrowRightIcon } from '@/components/icons';
import { classNames } from '@/util/utils';
import { basePath } from '@/config';

export default function PortalItem({ content }: { content: Portal }) {
  const [isMouseOver, setIsMouseOver] = useState<boolean>(false);

  return (
    <Link
      href={content.url}
      className={classNames(
        'transition-background relative flex h-48 w-full flex-row items-center justify-between rounded-sm p-3 duration-300 ease-linear',
        isMouseOver ? 'bg-primary-7' : 'bg-primary-8'
      )}
      onMouseOver={() => setIsMouseOver(true)}
      onFocus={() => setIsMouseOver(true)}
      onMouseOut={() => setIsMouseOver(false)}
      onBlur={() => setIsMouseOver(false)}
    >
      <div className="w-90percent flex h-full flex-row items-center">
        {/* Image */}
        <div className="bg-primary-2 shadow-strongImage h-full w-48 overflow-hidden">
          <Image
            src={`${basePath}/${content.image}`}
            alt={content.name}
            width={400}
            height={400}
            className="h-auto w-full"
          />
        </div>

        <TextContent content={content} />
      </div>

      <div className="w-10percent relative mr-5 flex h-4 items-center justify-center overflow-hidden">
        <ArrowRightIcon
          className={classNames(
            'transition-right absolute h-3 w-auto text-white duration-500 ease-in-out',
            isMouseOver ? 'right-0' : '-right-8'
          )}
        />
      </div>
    </Link>
  );
}
