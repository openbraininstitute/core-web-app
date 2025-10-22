'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

export default function SFNIntroduction() {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    amount: 0.4,
    once: true,
  });

  return (
    <div
      ref={ref}
      className="text-primary-9 flex min-h-[80vh] w-full flex-col items-start justify-center px-[8vw] py-[15vh]"
    >
      <div className="mb-4 w-2/3">
        <motion.h2
          className="font-serif text-[80px]! font-normal"
          initial={{ lineHeight: 3 }}
          animate={{ lineHeight: isInView ? 1.2 : 3 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ transformOrigin: 'top' }}
        >
          Visit Us at SfN2025 and Experience Our Virtual Labs in Action!
        </motion.h2>
      </div>
      <motion.div
        className="font-title border-neutral-3 flex flex-row gap-x-2 rounded-full border border-solid text-4xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: isInView ? 1 : 0,
          y: isInView ? 0 : 20,
        }}
        transition={{
          duration: 0.6,
          delay: isInView ? 0.9 : 0,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        <div className="px-8 py-5">November 15 – 19</div>
        <div className="bg-neutral-5 block h-full w-0.5" />
        <div className="px-6 py-5">Booth #3631</div>
      </motion.div>
    </div>
  );
}
