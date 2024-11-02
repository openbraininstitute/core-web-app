import { ArrowRightOutlined } from '@ant-design/icons';
import Link from 'next/link';

import { basePath } from '@/config';
import { THREE_COLUMN_SCREEN_ONE, ThreeColumnScreenOne } from '@/constants/home/content-home';

export function LargeButton() {
  return (
    <Link
      className="mt-10 flex h-auto w-[500px] justify-between rounded-none border border-primary-7 bg-transparent py-8 text-sm font-bold"
      href="/log-in"
      prefetch={false}
    >
      <span className="pl-4 text-4xl text-white">Log in</span>
      <ArrowRightOutlined className="pr-4 text-4xl text-white" />
    </Link>
  );
}

export default function HeaderScreen() {
  return (
    <div className="relative flex h-auto w-screen snap-start snap-always flex-col items-center justify-center px-8 py-44 text-white md:h-screen md:px-[16vw] md:py-0">
      <h1 className="relative z-10 w-full font-title text-5xl font-bold leading-[1.15] lg:text-[6vw] 2xl:text-[5vw]">
        Virtual labs to explore, build and simulate the brain
      </h1>

      <div className="relative z-10 mt-32 flex w-full grid-cols-3 flex-col gap-y-3 md:mt-10 md:grid md:gap-x-12 md:gap-y-0">
        {THREE_COLUMN_SCREEN_ONE.map((section: ThreeColumnScreenOne, index: number) => (
          <div
            className="flex flex-col gap-y-1 font-title text-2xl font-normal leading-[1.45] md:gap-y-2 lg:text-[1.6vw] 2xl:text-[1.2vw]"
            key={`Subtitle-${index + 1}`}
            style={{ color: section.available ? '#fff' : '#69c0ff' }}
          >
            <div className="flex flex-row items-center capitalize">
              <span className="hidden md:block">{index + 1} &#8212; </span>
              <span className="uppercase tracking-wider md:capitalize md:tracking-normal">
                {section.section}
              </span>{' '}
              {!section.available && (
                <div className="ml-4 rounded-full border border-solid border-primary-3 px-6 py-2 text-base">
                  Coming soon
                </div>
              )}
            </div>
            <h2>{section.content}</h2>
          </div>
        ))}
      </div>

      <div className="absolute left-0 top-0 z-0 h-screen w-screen">
        <video autoPlay muted loop className="h-full w-full object-cover">
          <source src={`${basePath}/video/VIDEO_1ST-SCREEN_HOME-Compressed.mp4`} type="video/mp4" />
        </video>
      </div>
    </div>
  );
}
