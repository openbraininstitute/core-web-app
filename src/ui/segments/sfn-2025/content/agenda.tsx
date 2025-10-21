import { CalendarFilled } from '@ant-design/icons';

import { PlayIcon } from '@/components/tutorials-carrousel/tutorial-card/play-icon';

import {
  generateGoogleCalendar,
  generateICalendar,
} from '@/ui/segments/sfn-2025/content/calendar-utils';
import Divider from '@/ui/segments/sfn-2025/content/divider';

type AgendaItemProps = {
  title: string;
  subtitle: string;
  time: string;
};

const agenda: AgendaItemProps[][] = [
  [
    {
      title: 'Explore & AI',
      subtitle: 'Explore Data & AI Functionalities',
      time: '9:30 – 10:00',
    },
    {
      title: 'Simulate',
      subtitle: 'Simulate Single Neurons & Synaptoms',
      time: '10:00 – 10:30',
    },
    {
      title: 'Modeling',
      subtitle: 'Model Small Microcircuits',
      time: '10:30 – 11:00',
    },
    {
      title: 'EM Skeletonization',
      subtitle: 'EM Skeletonization & Notebooks',
      time: '11:00 – 11:30',
    },
  ],
  [
    {
      title: 'Explore & AI',
      subtitle: 'Explore Data & AI Functionalities',
      time: '13:00 – 13:30',
    },
    {
      title: 'Simulate',
      subtitle: 'Simulate Single Neurons & Synaptoms',
      time: '13:30 – 14:00',
    },
    {
      title: 'Modeling',
      subtitle: 'Model Small Microcircuits',
      time: '14:00 – 14:30',
    },
    {
      title: 'EM Skeletonization',
      subtitle: 'EM Skeletonization & Notebooks',
      time: '14:30 – 15:00',
    },
  ],
];

function AgendaCard({ item }: { item: AgendaItemProps }) {
  return (
    <div className="border-neutral-3 text-primary-9 relative w-full rounded-2xl border border-solid p-6">
      <div className="relative mb-6">
        <header className="relative flex flex-row items-center justify-between">
          <h3 className="font-serif text-4xl! font-bold">{item.title}</h3>
          <p className="font-title border-primary-9 rounded-full border border-solid px-6 py-3 text-lg">
            {item.time}
          </p>
        </header>

        <p className="relative -top-1 text-xl">{item.subtitle}</p>
      </div>

      <div className="border-neutral-2 border border-solid text-xl">
        <div className="flex flex-row items-center">
          <PlayIcon className="h-auto w-12" />{' '}
          <div className="text-xl">Watch introduction tutorial</div>
        </div>
        <div className="bg-neutral-2 h-px w-full" />
        <div className="flex flex-row gap-x-2">
          <button
            type="button"
            onClick={() => generateICalendar(item)}
            className="flex cursor-pointer flex-row gap-x-2 px-4 py-3 transition-colors hover:bg-gray-100"
          >
            <CalendarFilled />
            Add to iCalendar
          </button>
          <div className="bg-neutral-2 h-full w-px" />
          <button
            type="button"
            onClick={() => generateGoogleCalendar(item)}
            className="flex cursor-pointer flex-row gap-x-2 px-4 py-3 transition-colors hover:bg-gray-100"
          >
            <CalendarFilled />
            Add to Google Calendar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SFNAgenda() {
  return (
    <div className="text-primary-9 relative flex w-full flex-row gap-x-4 px-8 py-[15vh]">
      <div className="sticky top-[15vh] h-fit w-1/2 pr-6 pl-[8vw]">
        <h2 className="font-serif text-6xl! leading-[1.2]! font-normal">Agenda</h2>
        <Divider />

        <p className="font-title text-lg leading-normal">
          Outside of our scheduled events and workshops, we warmly invite you to stop by our booth
          and explore the Open Brain Platform. Our team is here throughout the day, eager to
          introduce you to our tools, answer your questions, and guide you through the possibilities
          of collaborative neuroscience. Don&apos;t hesitate to come by — we&apos;re ready to welcome you and
          help you get started.
        </p>
      </div>
      <div className="w-1/2">
        <div className="flex flex-col gap-y-4">
          <div className="bg-neutral-1 font-title w-full rounded-full px-5 py-3 text-2xl tracking-wider uppercase">
            Morning
          </div>
          {agenda[0].map((item) => (
            <AgendaCard key={item.title} item={item} />
          ))}
        </div>
        <div className="mt-24 flex flex-col gap-y-4">
          <div className="bg-neutral-1 font-title w-full rounded-full px-5 py-3 text-2xl tracking-wider uppercase">
            Afternoon
          </div>
          {agenda[1].map((item) => (
            <AgendaCard key={item.title} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
