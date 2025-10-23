'use client';

import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Image from 'next/image';
import { useRef } from 'react';

import Divider from '@/ui/segments/sfn-2025/content/divider';

import image from '../images/brain-region_image-01.png';

export default function SFNVirtualLabs() {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    amount: 0.8,
    once: true,
  });

  const mouseY = useMotionValue(0);
  const rotate = useTransform(mouseY, [0, 1000], [6, -6]);
  const springRotate = useSpring(rotate, { stiffness: 100, damping: 30 });

  const handleMouseMove = (event: React.MouseEvent) => {
    mouseY.set(event.clientY);
  };

  return (
    <div
      ref={ref}
      className="text-primary-9 relative flex min-h-[80vh] w-full flex-col items-center justify-center overflow-hidden bg-gray-100 px-8 py-4 md:min-h-[50vh] md:flex-row-reverse md:justify-start md:py-8"
      onMouseMove={handleMouseMove}
    >
      <div className="relative z-10 flex w-full flex-col pr-8 md:w-1/2">
        <h2 className="font-serif text-6xl! font-normal md:text-[80px]!">Virtual Labs</h2>
        <Divider />

        <p className="font-title text-2xl! leading-normal md:text-lg">
          Step into the future of neuroscience and discover how our Virtual Labs empower you to
          explore, build, and experiment with Digital Brain Models — from single neurons to small
          microcircuits. Uncover how cutting-edge simulation meets interactivity, data exploration,
          and AI — all in one powerful platform.
        </p>
      </div>

      <motion.div
        className="absolute -top-12 left-[10vw] z-0 w-full md:top-0 md:h-full"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={isInView ? { scale: 1.2, opacity: 1 } : { scale: 0.8, opacity: 0 }}
        transition={{
          duration: 1,
          ease: 'easeOut',
        }}
        style={{ rotate: springRotate }}
      >
        <Image
          src={image}
          className="relative -left-[20vw] h-full w-auto"
          alt="Multiple brain region image"
          width={990}
          height={558}
        />
      </motion.div>
    </div>
  );
}
