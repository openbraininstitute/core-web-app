'use client';

import Image from 'next/image';

import { Button } from '@/ui/molecules/button';
import { Card, CardContent } from '@/ui/molecules/card';
import { cn } from '@/utils/css-class';

import { QuickAccess } from '../data';

const imageStyle = {
  borderRadius: '50%',
  border: '1px solid #fff',
};

function CardItem({
  poster,
  title,
  note,
  description,
}: {
  note: string;
  poster: string;
  title: string;
  description: string;
}) {
  return (
    <Card
      className={cn(
        'w-full bg-white border-none flex-1',
        'shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)]'
      )}
    >
      <div className="relative h-41.75 w-auto">
        <Image fill alt={title} src={poster} objectFit="contain" style={imageStyle} />
      </div>
      <CardContent>
        <h4 className="text-neutral-400">{note}</h4>
        <h1 className="font-black text-primary-8 text-lg 2xl:text-xl">{title}</h1>
        <p className="text-neutral-4">{description}</p>
      </CardContent>
    </Card>
  );
}

export function MainCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 items-stretch w-full">
      {QuickAccess.map(({ default: dft, title: groupTitle, list }) => (
        <div key={dft.id} className="flex flex-col gap-1.5 w-full">
          <CardItem
            note={groupTitle}
            title={dft.title}
            poster={dft.poster}
            description={dft.description}
          />
          <Button
            rounded
            size="responsive"
            variant="outline"
            className="w-full bg-background shadow-none hover:font-bold hover:bg-white hover:shadow-md"
          >
            View {groupTitle} examples ({list.length}){' '}
          </Button>
        </div>
      ))}
    </div>
  );
}
