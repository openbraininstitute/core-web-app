'use client';

import Image from 'next/image';

import { useInView } from 'react-intersection-observer';

import { basePath } from '@/config';
import { SCREEN_TWO } from '@/constants/home/content-home';

export default function ScreenBBGithub() {
  const { ref, inView } = useInView({
    threshold: 0.9,
  });

  return (
    <div
      className="relative flex h-auto w-screen snap-start snap-always flex-col items-center justify-center gap-y-6 px-8 md:h-screen md:px-[16vw] "
      ref={ref}
    >
      <div className="relative z-10 flex flex-col gap-y-16 md:gap-y-8">
        <h3 className="font-title text-6xl font-bold leading-[1.3] text-white md:text-7xl 2xl:text-[4vw]">
          {SCREEN_TWO.title}
        </h3>
        <div className="flex grid-cols-2 flex-col gap-10 md:grid">
          {SCREEN_TWO.content.map((content: { title: string; paragraph: string }) => (
            <div className="flex flex-col gap-y-2 font-title" key={content.title}>
              <h4 className="text-3xl font-semibold uppercase tracking-wider text-primary-4 md:text-2xl">
                {content.title}
              </h4>
              <p className="font-sans text-2xl leading-normal text-white md:font-title md:text-lg">
                {content.paragraph}
              </p>
            </div>
          ))}
        </div>
      </div>
      <Image
        src={`${basePath}/images/home/home_background_block-1.webp`}
        alt="Image of the hippocampus illustrating the Blue Brain Open Platform"
        width={1920}
        height={1080}
        className="absolute -bottom-2 right-0 z-0 h-full w-full origin-bottom object-cover transition-all duration-300 ease-in-out"
        style={{
          transform: inView ? 'scale(1.05)' : 'scale(1)',
          opacity: inView ? 1 : 0.6,
        }}
      />
    </div>
  );
}
