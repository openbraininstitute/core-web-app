import Link from 'next/link';
import { Dispatch, SetStateAction } from 'react';
import { useInView } from 'react-intersection-observer';

import { OBPLogo } from '@/components/Entrypoint/segments/Splash';
import { classNames } from '@/util/utils';

type SingleSectionProps = {
  title: string;
  items: {
    title: string;
    url: string;
  }[];
};

const content = [
  {
    title: 'Blue Brain Project',
    items: [
      {
        title: 'The Blue Brain Project',
        url: 'https://www.epfl.ch/research/domains/bluebrain/',
      },
      {
        title: 'Blue Brain Portal',
        url: 'https://portal.bluebrain.epfl.ch/',
      },
      {
        title: "Project's timeline",
        url: 'https://www.epfl.ch/research/domains/bluebrain/blue-brain/about/timeline/',
      },
    ],
  },
  {
    title: 'Documentation',
    items: [
      {
        title: 'Blue Brain Nexus',
        url: 'https://bluebrainnexus.io/',
      },
      {
        title: 'Channelpedia',
        url: 'https://channelpedia.epfl.ch/',
      },
      {
        title: 'NMC portal',
        url: 'https://bbp.epfl.ch/nmc-portal/welcome.html',
      },
      {
        title: 'Hippocampus Hub',
        url: 'https://www.hippocampushub.eu/',
      },
    ],
  },
];

export default function Footer({
  onShowSteps,
  className,
}: {
  onShowSteps?: Dispatch<SetStateAction<boolean>>;
  className?: string;
}) {
  const { ref } = useInView({
    threshold: 0.5,
    onChange(inView) {
      if (onShowSteps) {
        onShowSteps(!inView);
      }
    },
  });

  return (
    <div
      ref={ref}
      className={classNames(
        'relative flex w-full snap-start flex-col items-start justify-between gap-x-8 border-t border-solid border-primary-4 px-8 pb-20 pt-32 md:mt-[30vh] md:px-[14vw] xl:flex-row',
        className
      )}
    >
      <OBPLogo color="text-white" className="mb-20 md:mb-0" />
      <div className="relative flex w-full flex-col justify-between gap-16 md:w-1/2 md:flex-row md:gap-8 xl:gap-0">
        {content.map((section: SingleSectionProps, index: number) => (
          <div
            key={`Footer_element-${section.title}-${index + 1}`}
            className="flex w-full flex-col gap-y-3"
          >
            <h4 className="w-full text-2xl font-light uppercase tracking-[0.06em] text-primary-2 md:text-xl md:font-semibold">
              {section.title}
            </h4>
            {section.items.map((item: { title: string; url: string }, idx: number) => (
              <Link
                key={`link_${item.title}-${idx + 1}`}
                href={item.url}
                className="font-sans text-3xl font-semibold leading-normal text-white transition-colors duration-200 ease-linear hover:text-primary-4 md:text-xl md:font-light"
              >
                {item.title}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
