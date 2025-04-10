'use client';

import Image from 'next/image';
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
      href={`/app/virtual-lab/public-projects/${value.slug}?section=description`}
      className="border-primary-7 bg-primary-9 hover:bg-primary-7 relative w-full overflow-hidden rounded-lg border border-solid p-8 text-white transition-all duration-300 ease-in-out hover:scale-[0.98]"
    >
      <header className="relative z-10 mb-2 flex w-full flex-row justify-between">
        <div className="text-3xl font-bold">{value.name}</div>
        <div className="bg-primary-9 rounded-3xl px-6 pt-1 text-base font-normal">
          Latest update: {date}
        </div>
      </header>

      <div className="font-lg relative z-10 w-1/2 leading-normal font-light text-white">
        <p className="line-clamp-2">{value.introduction}</p>
      </div>

      <Image
        src={value.heroImage}
        width={1124}
        height={216}
        alt={`Image of the showcase ${value.name}`}
        className="absolute top-0 left-0 z-0 h-auto w-full"
      />
    </a>
  );
}
