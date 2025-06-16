'use client';

import Image from 'next/image';
import { CircuitSchemaProps } from '../../../type';
import placeholderImage from './circuit_placeholder.jpg';

export default function Visualisation({ content }: { content: CircuitSchemaProps }) {
  const imageUrl = content.overview.mainDisplay[0].url || placeholderImage;

  console.log('Image URL:', imageUrl);

  return (
    <div className="relative w-full">
      <Image
        src={imageUrl || placeholderImage}
        width={1920}
        height={1080}
        alt={`Image of the circuit ${content.name}`}
        className="h-auto w-full transition-all duration-300 ease-out"
        priority
      />
    </div>
  );
}
