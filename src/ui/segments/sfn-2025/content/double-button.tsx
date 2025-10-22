'use client';

import { motion, useInView } from 'framer-motion';
import Image, { StaticImageData } from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';

import image1 from '../images/background_image_buttons-01.jpg';

type LinkButtonProps = {
  title: string;
  description: string;
  link: string;
  bgUrl: StaticImageData;
};

const linkButtons: LinkButtonProps[] = [
  {
    title: 'Discover OBI',
    description: 'Explore our virtual labs and see how they work',
    link: '/',
    bgUrl: image1,
  },

  {
    title: 'Your virtual lab',
    description:
      'Create your Virtual Lab on the Open Brain Platform and join a global network accelerating open neuroscience.',
    link: '/app/virtual-lab',
    bgUrl: image1,
  },
];

function LinkButton({
  title,
  description,
  link,
  bgUrl,
  isInView,
  delay = 0,
}: LinkButtonProps & { isInView: boolean; delay?: number }) {
  return (
    <motion.div
      className="w-1/2"
      initial={{ height: 0 }}
      animate={{ height: isInView ? '60vh' : 0 }}
      transition={{ duration: 0.8, ease: 'easeInOut', delay }}
    >
      <Link
        href={link}
        className="relative flex h-full w-full flex-row gap-x-4 overflow-hidden rounded-xl p-10"
      >
        <div className="text-primary-9 relative z-10 h-1/2 w-full bg-white p-12">
          <motion.div
            className="font-serif text-6xl!"
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: isInView ? 1 : 0,
              y: isInView ? 0 : 20,
            }}
            transition={{
              duration: 0.6,
              delay: isInView ? 0.8 : 0,
              ease: 'easeOut',
            }}
          >
            {title}
          </motion.div>
          <motion.p
            className="font-title text-xl!"
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: isInView ? 1 : 0,
              y: isInView ? 0 : 20,
            }}
            transition={{
              duration: 0.6,
              delay: isInView ? 1.0 : 0,
              ease: 'easeOut',
            }}
          >
            {description}
          </motion.p>
        </div>
        <Image
          src={bgUrl}
          alt={title}
          width={1000}
          height={1000}
          className="absolute inset-0 h-full object-cover"
        />
      </Link>
    </motion.div>
  );
}

export default function SFNDoubleButton() {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    amount: 0.5,
    once: false,
  });

  return (
    <div ref={ref} className="flex flex-row gap-x-4 px-[2vw] py-[10vh]">
      {linkButtons.map((button, index) => (
        <LinkButton
          key={button.title}
          title={button.title}
          description={button.description}
          link={button.link}
          bgUrl={button.bgUrl}
          isInView={isInView}
          delay={index === 1 ? 0.3 : 0}
        />
      ))}
    </div>
  );
}
