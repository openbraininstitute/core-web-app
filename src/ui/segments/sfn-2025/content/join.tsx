'use client';

import { BuildOutlined, SearchOutlined, SettingFilled } from '@ant-design/icons';

const CONTENT_SECTIONS = [
  {
    title: 'Explore',
    icon: <SearchOutlined />,
  },
  {
    title: 'Build',
    icon: <BuildOutlined />,
  },
  {
    title: 'Experiment',
    icon: <SettingFilled />,
  },
];

export default function SFNJoin() {
  return (
    <div className="relative flex w-full flex-col items-start px-[8vw] py-[5vh]">
      <header className="relative z-10 mb-8 flex w-full flex-col pr-0 md:w-2/3 md:pr-8">
        <h2 className="mb-4 font-serif text-6xl! leading-none! font-normal md:mb-0 md:text-[80px]! md:leading-[1.2]!">
          Join our live demos
        </h2>
        <p className="font-title text-2xl! leading-normal!">
          ...and see neuroscience come alive — faster, smarter, and more interactive than ever
          before.
        </p>
      </header>
      <div className="flex w-full flex-col gap-y-4 md:flex-row md:gap-x-4">
        {CONTENT_SECTIONS.map((section) => (
          <div
            key={section.title}
            className="border-neutral-2 flex flex-row items-center gap-x-2 rounded-full border border-solid px-8 py-4"
          >
            {section.icon}
            <p className="text-2xl! font-normal">{section.title}</p>
          </div>
        ))}
      </div>
      <div className="font-title mt-8 rounded-full bg-red-600 px-10 py-4 text-3xl text-white">
        Only at Booth #3631
      </div>
    </div>
  );
}
