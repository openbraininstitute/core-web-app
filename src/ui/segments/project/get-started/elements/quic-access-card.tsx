'use client';

import Image from 'next/image';

import { BrokenImageIcon } from '@/components/icons/image-states';
import { Card, CardContent } from '@/ui/molecules/card';
import { Skeleton } from '@/ui/molecules/skeleton';
import { cn } from '@/utils/css-class';

const imageStyle = {
  borderRadius: '50%',
  border: '1px solid #fff',
};

export function CardItem({
  preview,
  title,
  note,
  description,
}: {
  note: string | undefined | null;
  preview: string | undefined | null;
  title: string | undefined;
  description: string | undefined;
}) {
  return (
    <Card
      className={cn(
        'w-full bg-white border-none flex-1',
        'shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)]'
      )}
    >
      <div className="relative h-41.75 w-auto">
        {preview ? (
          <Image
            fill
            alt={title ?? 'preview'}
            src={preview}
            objectFit="contain"
            style={imageStyle}
          />
        ) : (
          <Skeleton active={false} className="flex items-center justify-center w-full h-full">
            <BrokenImageIcon className="w-20 h-20 text-gray-300" />
          </Skeleton>
        )}
      </div>
      <CardContent>
        <h4 className="text-neutral-400">{note}</h4>
        <h1 className="font-black text-primary-8 text-lg 2xl:text-xl" title={title}>
          {title ?? 'No title provided'}
        </h1>
        <p className="text-neutral-4 line-clamp-2" title={description}>
          {description ?? 'No description provided'}
        </p>
      </CardContent>
    </Card>
  );
}
