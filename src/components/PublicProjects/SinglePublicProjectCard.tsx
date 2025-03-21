'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ShowCaseProjectQueryType } from './type';

function getDaysFromDate(inputDate: string | Date): number | string {
  const startDate = new Date(inputDate);
  const today = new Date();

  startDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffInMs: number = today.getTime() - startDate.getTime();

  const diffInDays: number = Math.floor(diffInMs / 86400000);

  return diffInDays;
}

export default function SinglePublicProjectCard({ value }: { value: ShowCaseProjectQueryType }) {
  const [isMouseHover, setIsMouseHover] = useState<boolean>(false);

  let date;

  switch (getDaysFromDate(value._updatedAt)) {
    case 0:
      date = 'Today';
      break;
    case 1:
      date = 'Yesterday';
      break;
    default:
      date = `${getDaysFromDate(value._updatedAt)} days ago`;
  }

  return (
    <a
      href={`/app/piublic-projects/${value.slug}?section=description`}
      className="relative w-full scale-100 overflow-hidden rounded-3xl border border-solid border-primary-7 bg-primary-9 p-8 text-white transition-all duration-300 ease-in-out hover:scale-[0.98] hover:bg-primary-7"
      style={{
        boxShadow: isMouseHover
          ? '0px 30px 24px -12px rgba(0,0,0,0.4)'
          : '0px 47px 56px -24px rgba(0,0,0,0.35)',
      }}
      onMouseOver={() => setIsMouseHover(true)}
      onFocus={() => setIsMouseHover(true)}
      onMouseOut={() => setIsMouseHover(false)}
      onBlur={() => setIsMouseHover(false)}
    >
      <header className="relative z-10 mb-2 flex w-full flex-row justify-between">
        <div className="text-3xl font-bold">{value.name}</div>
        <div className="rounded-3xl bg-primary-9 px-6 pt-1 text-base font-normal">
          Latest update: {date}
        </div>
      </header>

      <div className="font-lg relative z-10 w-1/2 font-light leading-normal text-white">
        <p>{value.introduction}</p>
      </div>

      <Image
        src={value.heroImage}
        width={1124}
        height={216}
        alt={`Image of the showcase ${value.name}`}
        className="absolute left-0 top-0 z-0 h-auto w-full"
      />
    </a>
  );
}
