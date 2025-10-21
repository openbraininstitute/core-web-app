'use client';

import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Image from 'next/image';
import { useRef } from 'react';

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
      className="text-primary-9 relative flex min-h-[50vh] w-full flex-row-reverse items-center overflow-hidden bg-gray-100 p-8"
      onMouseMove={handleMouseMove}
    >
      <div className="relative z-10 flex w-1/2 flex-col pr-8">
        <h2 className="font-serif text-[80px]! font-normal">Virtual Labs</h2>
        <p className="font-title text-lg leading-normal">
          Step into the future of neuroscience and discover how our Virtual Labs empower you to
          explore, build, and experiment with Digital Brain Models — from single neurons to small
          microcircuits. Uncover how cutting-edge simulation meets interactivity, data exploration,
          and AI — all in one powerful platform.
        </p>
      </div>

      <motion.div
        className="absolute top-0 left-0 z-0"
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
