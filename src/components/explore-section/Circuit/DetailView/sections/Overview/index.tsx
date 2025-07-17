'use client';

import Image from 'next/image';
import { CircuitSchemaProps } from '../../../type';
import SubtitleBar from '../global/SubtitleBar';

type ImageProps = {
  name: string;
  url: string;
};

export default function OverviewSection({ content }: { content: CircuitSchemaProps }) {
  return (
    <div className="relative flex w-full flex-col">
      <SubtitleBar title="Cell properties" />
      <div className="relative flex flex-col gap-y-4">
        {content.overview.cellStatistics.map((image: ImageProps) => (
          <Image
            key={image.name}
            src={image.url}
            alt={image.name}
            width={1920}
            height={1080}
            className="mb-4 h-auto w-full"
          />
        ))}
      </div>

      <SubtitleBar title="Network properties" />
      <div className="relative flex flex-col gap-y-4">
        {content.overview.networkStatistics.map((image: ImageProps) => (
          <Image
            key={image.name}
            src={image.url}
            alt={image.name}
            width={1920}
            height={1080}
            className="mb-4 h-auto w-full"
          />
        ))}
      </div>
    </div>
  );
}
