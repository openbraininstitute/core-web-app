'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { SingleGallery } from '@/types/explore-gallery';
import { classNames } from '@/util/utils';
import { basePath } from '@/config';

export default function Card({ content }: { content: SingleGallery }) {
  const [mouseStatus, setMouseStatus] = useState<boolean>(false);

  return (
    <Link
      href={`/app/explore/gallery/${content.slug.current}`}
      className={classNames(
        'transition-background relative flex flex-col rounded-md p-3 duration-500 ease-linear',
        mouseStatus ? 'bg-primary-7' : 'bg-primary-8'
      )}
      onMouseOver={() => setMouseStatus(true)}
      onFocus={() => setMouseStatus(true)}
      onMouseOut={() => setMouseStatus(false)}
      onBlur={() => setMouseStatus(false)}
    >
      <div
        className={classNames(
          'shadow-strongImage block w-full origin-center overflow-hidden rounded-xs transition-transform duration-500 ease-in-out',
          mouseStatus ? 'scale-100' : 'scale-95'
        )}
      >
        <Image
          src={`${basePath}/${content.imageCover}`}
          alt={content.title}
          width={400}
          height={400}
          className={classNames(
            'transform-filter h-auto w-full',
            mouseStatus ? 'brightness-100' : 'brightness-90'
          )}
        />
      </div>
      <div className="flex w-full flex-col p-2">
        <h2 className="mt-5 text-2xl font-bold text-white">{content.title}</h2>

        <aside className="border-primary-6 my-2 flex flex-row items-center gap-x-2 border border-solid p-1">
          <div className="text-primary-2 flex flex-row text-xs font-normal">127 images</div>
          <div className="bg-primary-6 block h-3 w-px" />
          <div className="text-primary-2 flex flex-row text-xs font-normal">32 videos</div>
        </aside>

        <p className="text-primary-3 leading-normal font-normal">{content.description}</p>
      </div>
    </Link>
  );
}
