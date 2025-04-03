'use client';

import Image from 'next/image';
import { CircuitSchemaProps } from '../../type';
import placeholderImage from './circuit-preview-image_01.jpg';

export default function Visualiser({ content }: { content: CircuitSchemaProps }) {
  const imageUrl = content.overview.mainDisplay[0].url;

  return (
    <div
      id="visualiser"
      className="relative my-24 flex w-full items-center justify-center overflow-hidden bg-white"
    >
      <Image
        src={imageUrl || placeholderImage}
        width={1920}
        height={1080}
        alt={`Image of the circuit ${content.name}`}
        className="relative z-10 select-none transition-all duration-300 ease-out"
        priority
      />
    </div>
  );
}
