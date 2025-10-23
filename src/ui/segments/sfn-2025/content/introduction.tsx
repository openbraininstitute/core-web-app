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
      className="text-primary-9 flex w-full flex-col items-start justify-center px-[8vw] py-[15vh] md:min-h-[80vh]"
    >
      <div className="mb-6 w-full md:mb-4 md:w-2/3">
        <motion.h2
          className="font-serif text-4xl! font-normal md:text-[80px]!"
          initial={{ lineHeight: 3 }}
          animate={{ lineHeight: isInView ? 1.2 : 3 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ transformOrigin: 'top' }}
        >
          Visit Us at SfN2025 and Experience Our Virtual Labs in Action!
        </motion.h2>
      </div>
      <motion.div
        className="font-title border-neutral-3 flex flex-col items-start gap-x-2 rounded-lg border border-solid py-2 text-2xl md:flex-row md:items-center md:rounded-full md:py-0 md:text-4xl"
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
        <div className="px-6 py-0.5 md:py-3">November 15 – 19</div>
        <div className="px-6 py-0.5 md:py-3">Booth #3631</div>
      </motion.div>
    </div>
  );
}
