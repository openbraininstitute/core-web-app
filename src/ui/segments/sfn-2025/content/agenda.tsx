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
    <div className="border-neutral-2 text-primary-9 relative w-full rounded-2xl border border-solid p-6">
      <div className="relative mb-6">
        <header className="relative mb-5 flex flex-col items-start justify-between md:mb-0 md:flex-row md:items-center">
          <h3 className="mb-3 font-serif text-5xl! font-bold md:mb-0">{item.title}</h3>
          <p className="font-title border-primary-9 rounded-full border border-solid px-6 py-2 text-2xl! md:py-3">
            {item.time}
          </p>
        </header>

        <p className="relative -top-1 text-2xl! md:text-xl!">{item.subtitle}</p>
      </div>

      <div className="text-neutral-4 text-xl">
        <div className="flex flex-row items-center">
          <PlayIcon className="h-auto w-12" />{' '}
          <div className="text-xl">Watch introduction tutorial</div>
        </div>
        <div className="bg-neutral-2 h-px w-full" />
        <div className="flex flex-row gap-x-2">
          <button
            type="button"
            onClick={() => generateICalendar(item)}
            className="flex cursor-pointer flex-row gap-x-2 px-0 py-3 text-left text-lg! transition-colors hover:bg-gray-100 md:px-4"
          >
            <div className="hidden md:block">
              <CalendarFilled />
            </div>
            Add to iCalendar
          </button>
          <div className="bg-neutral-2 h-full w-px" />
          <button
            type="button"
            onClick={() => generateGoogleCalendar(item)}
            className="flex cursor-pointer flex-row gap-x-2 px-0 py-3 text-left text-lg! transition-colors hover:bg-gray-100 md:px-4"
          >
            <div className="hidden md:block">
              <CalendarFilled />
            </div>
            Add to Google Calendar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SFNAgenda() {
  return (
    <div className="text-primary-9 relative flex w-full flex-col gap-x-4 px-8 py-12 md:flex-row md:py-[15vh]">
      <div className="relative top-0 mb-12 h-fit w-full pr-0 pl-0 md:sticky md:top-[15vh] md:mb-0 md:w-1/2 md:pr-6 md:pl-[8vw]">
        <h2 className="font-serif text-6xl! leading-[1.2]! font-normal">Agenda</h2>
        <Divider />

        <p className="font-title text-xl! leading-normal md:text-lg!">
          Outside of our scheduled events and workshops, we warmly invite you to stop by our booth
          and explore the Open Brain Platform. Our team is here throughout the day, eager to
          introduce you to our tools, answer your questions, and guide you through the possibilities
          of collaborative neuroscience. Don&apos;t hesitate to come by — we&apos;re ready to
          welcome you and help you get started.
        </p>
      </div>
      <div className="w-full md:w-1/2">
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
