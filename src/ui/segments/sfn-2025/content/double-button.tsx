'use client';

import { motion, useInView } from 'framer-motion';
import Image, { StaticImageData } from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import image1 from '../images/background_image_buttons-01.jpg';

// Custom hook to detect screen size
function useScreenSize() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return isMobile;
}

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
  const isMobile = useScreenSize();
  const targetHeight = isMobile ? '30vh' : '60vh';

  return (
    <motion.div
      className="w-full md:w-1/2"
      initial={{ height: 0 }}
      animate={{ height: isInView ? targetHeight : 0 }}
      transition={{ duration: 0.8, ease: 'easeInOut', delay }}
    >
      <Link
        href={link}
        className="relative flex h-full w-full flex-row gap-x-4 overflow-hidden rounded-xl p-6 md:p-10"
      >
        <div className="text-primary-9 relative z-10 h-full w-full bg-white p-6 md:h-1/2 md:p-12">
          <motion.div
            className="mb-3 font-serif text-4xl! md:mb-4 md:text-6xl!"
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
            className="font-title text-2xl! leading-normal! md:text-xl!"
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
    <div ref={ref} className="flex flex-col gap-4 px-[2vw] py-12 md:flex-row md:py-[10vh]">
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
