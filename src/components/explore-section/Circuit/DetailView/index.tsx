'use client'

import { InteractiveImageProps, SingleCircuitListView } from "../type";
import HeaderCircuitDetailView from "./modules/Header";
import HeroImageContainer from "./modules/HeroImageContainer";
import CircuitDetailViewSectionContainer from "./sections";

export default function CircuitDetailViewMain({
  content
}:{
  content: SingleCircuitListView;
}) {

  const heroImage: InteractiveImageProps = {
    circuit: content.name,
    src: content.images.high,
    alt: `Image of the circuit ${content.name}`,
    width: 1920,
    height: 1080
  }

  return (
    <div className="relative w-full bg-white p-10 pb-40 overflow-x-hidden">
        <HeaderCircuitDetailView content={content} />
        <HeroImageContainer content={heroImage}  />
        <CircuitDetailViewSectionContainer content={content} />
    </div>
  )
}