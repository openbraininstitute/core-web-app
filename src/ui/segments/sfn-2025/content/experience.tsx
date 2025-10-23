'use client';

import { motion, useInView } from 'framer-motion';
import Image from 'next/image';
import { useRef } from 'react';

import image from '../images/background_white-brain.jpg';

import Divider from '@/ui/segments/sfn-2025/content/divider';

export default function SFNExperience() {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    amount: 0.8,
    once: true,
  });

  return (
    <div
      ref={ref}
      className="text-primary-9 relative flex min-h-[50vh] w-full flex-col px-[8vw] py-12 md:py-[25vh]"
    >
      <div className="relative z-10">
        <h2 className="font-serif text-6xl! leading-none font-normal md:leading-[1.2]!">
          What you will experience
        </h2>
        <Divider />

        <ul className="flex list-inside list-disc flex-col gap-y-6 text-2xl! md:gap-y-2 md:text-xl">
          <li>Explore data interactively and uncover hidden patterns with AI-powered insights</li>
          <li>Simulate single neurons and synaptoms to visualize function and connectivity</li>
          <li>Build and test small microcircuits to understand network-level dynamics</li>
          <li>Switch seamlessly between intuitive UI and interactive notebooks</li>
          <li>Generate EM Skeletonized morphologies and connect structure and computation</li>
        </ul>
      </div>

      <motion.div
        className="absolute top-0 right-0 z-0"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
        transition={{
          duration: 0.3,
          ease: 'easeOut',
        }}
      >
        <Image src={image} alt="Experience image" width={1512} height={814} />
      </motion.div>
    </div>
  );
}
