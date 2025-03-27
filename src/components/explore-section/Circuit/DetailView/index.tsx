'use client';

import { CircuitSchemaProps, InteractiveImageProps } from '../type';
import HeaderCircuitDetailView from './modules/Header';
import HeroImageContainer from './modules/HeroImageContainer';
import CircuitDetailViewSectionContainer from './sections';

export default function CircuitDetailViewMain({ content }: { content: CircuitSchemaProps }) {
  const heroImage: InteractiveImageProps = {
    circuit: content.name,
    // @ts-ignore TODO FIX
    src: content.images.high,
    alt: `Image of the circuit ${content.name}`,
    width: 1920,
    height: 1080,
  };

  return (
    <div className="w-[calc(100vw - 80px)] relative overflow-x-hidden bg-white p-10 pb-40">
      <HeaderCircuitDetailView content={content} />
      <HeroImageContainer content={heroImage} />
      <CircuitDetailViewSectionContainer content={content} />
    </div>
  );
}
