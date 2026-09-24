'use client';

import { CalendarFilled, CloseOutlined } from '@ant-design/icons';
import { useState } from 'react';

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
  videoUrl: string;
  agendaText?: string;
};

const agenda: AgendaItemProps[][] = [
  [
    {
      title: 'Explore & AI',
      subtitle:
        'Explore datasets interactively and reveal hidden patterns through AI-driven insights',
      time: '9:30 – 10:00',
      videoUrl:
        'https://player.vimeo.com/progressive_redirect/playback/1129947181/rendition/1080p/file.mp4?loc=external&log_user=0&signature=736d65d94e55d92d57a5259c4c031ef837eb22c48104a25361cea38fdfb68ed1',
      agendaText:
        "Learn more on Data Exploration & AI Functionalities accessible on the Open Brain Institute's Virtual Labs at booth #3631.",
    },
    {
      title: 'Simulate',
      subtitle:
        'Simulate, test and analyze microcircuits to study emergent network-level behaviors',
      time: '10:00 – 10:30',
      videoUrl:
        'https://player.vimeo.com/progressive_redirect/playback/1129947343/rendition/1080p/file.mp4%20%281080p%29.mp4?loc=external&log_user=0&signature=e55eaaaef143bdbc0130b74114c774cd4988d6a8c402f99ecde9957d903c16c3',
      agendaText:
        'Learn how to run single neuron and synaptoms simulations in our Virtual Labs. Open Brain Institute - Booth #3631',
    },
    {
      title: 'Modeling',
      subtitle: 'Model single neurons and synaptoms to visualize function and structure',
      time: '10:30 – 11:00',
      videoUrl:
        'https://player.vimeo.com/progressive_redirect/playback/1129947455/rendition/1080p/file.mp4%20%281080p%29.mp4?loc=external&log_user=0&signature=fbbf0b61ed56cf2667fe11ae2fe68e7151b5713857a64633abc50c3502917465',
      agendaText:
        "Learn more on modeling small microcircuits accessible on the Open Brain Institute's Virtual Labs at booth #3631.",
    },
    {
      title: 'EM Skeletonization',
      subtitle: 'Generate EM Skeletonized Morphologies & Run Notebooks',
      time: '11:00 – 11:30',
      videoUrl:
        'https://player.vimeo.com/progressive_redirect/playback/1129947485/rendition/1080p/file.mp4%20%281080p%29.mp4?loc=external&log_user=0&signature=57960071b0e97d216e5ebf23f865e39561c24a24f754bc47001185f9a4e0370d',
      agendaText:
        "Learn more on EM Skeletonization & Notebooks accessible on the Open Brain Institute's Virtual Labs at booth #3631.",
    },
  ],
  [
    {
      title: 'Explore & AI',
      subtitle:
        'Explore datasets interactively and reveal hidden patterns through AI-driven insights',
      time: '13:00 – 13:30',
      videoUrl:
        'https://player.vimeo.com/progressive_redirect/playback/1129947181/rendition/1080p/file.mp4?loc=external&log_user=0&signature=736d65d94e55d92d57a5259c4c031ef837eb22c48104a25361cea38fdfb68ed1',
      agendaText:
        "Learn more on Data Exploration & AI Functionalities accessible on the Open Brain Institute's Virtual Labs at booth #3631.",
    },
    {
      title: 'Simulate',
      subtitle:
        'Simulate, test and analyze microcircuits to study emergent network-level behaviors',
      time: '13:30 – 14:00',
      videoUrl:
        'https://player.vimeo.com/progressive_redirect/playback/1129947343/rendition/1080p/file.mp4%20%281080p%29.mp4?loc=external&log_user=0&signature=e55eaaaef143bdbc0130b74114c774cd4988d6a8c402f99ecde9957d903c16c3',
      agendaText:
        'Learn how to run single neuron and synaptoms simulations in our Virtual Labs. Open Brain Institute - Booth #3631',
    },
    {
      title: 'Modeling',
      subtitle: 'Model single neurons and synaptoms to visualize function and structure',
      time: '14:00 – 14:30',
      videoUrl:
        'https://player.vimeo.com/progressive_redirect/playback/1129947455/rendition/1080p/file.mp4%20%281080p%29.mp4?loc=external&log_user=0&signature=fbbf0b61ed56cf2667fe11ae2fe68e7151b5713857a64633abc50c3502917465',
      agendaText:
        "Learn more on modeling small microcircuits accessible on the Open Brain Institute's Virtual Labs at booth #3631.",
    },
    {
      title: 'EM Skeletonization',
      subtitle: 'Generate EM Skeletonized Morphologies & Run Notebooks',
      time: '14:30 – 15:00',
      videoUrl:
        'https://player.vimeo.com/progressive_redirect/playback/1129947485/rendition/1080p/file.mp4%20%281080p%29.mp4?loc=external&log_user=0&signature=57960071b0e97d216e5ebf23f865e39561c24a24f754bc47001185f9a4e0370d',
      agendaText:
        "Learn more on EM Skeletonization & Notebooks accessible on the Open Brain Institute's Virtual Labs at booth #3631.",
    },
  ],
];

function AgendaCard({
  item,
  onVideoClick,
}: {
  item: AgendaItemProps;
  onVideoClick: (videoUrl: string) => void;
}) {
  return (
    <div className="border-neutral-2 text-primary-9 relative w-full rounded-2xl border border-solid p-6">
      <div className="relative mb-6">
        <header className="relative mb-5 flex flex-col items-start justify-between md:mb-0 md:flex-row md:items-center">
          <h3 className="mb-3 font-serif text-5xl! font-bold md:mb-0">{item.title}</h3>
          <p className="font-title border-primary-9 rounded-full border border-solid px-6 py-2 text-2xl! md:py-3">
            {item.time}
          </p>
        </header>

        <p className="mt-1 w-2/3 text-2xl! md:text-xl!">{item.subtitle}</p>
      </div>

      <div className="text-neutral-4 text-xl">
        <button
          type="button"
          name="watch-introduction-tutorial"
          aria-label="Watch introduction tutorial"
          onClick={() => onVideoClick(item.videoUrl)}
          className="flex flex-row items-center"
        >
          <PlayIcon className="h-auto w-12" />{' '}
          <div className="text-xl">Watch introduction tutorial</div>
        </button>
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

function VideoModal({
  isOpen,
  videoUrl,
  onClose,
}: {
  isOpen: boolean;
  videoUrl: string;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      <div
        className="bg-opacity-75 absolute inset-0 bg-black/80"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onClose();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Close video modal backdrop"
      />

      <div className="relative z-10 w-[80vw]">
        <button
          type="button"
          onClick={onClose}
          className="bg-opacity-20 hover:bg-opacity-30 absolute -top-12 right-0 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-solid border-white text-white transition-all"
          aria-label="Close video modal"
        >
          <CloseOutlined className="text-xl" />
        </button>

        <video
          src={videoUrl}
          controls
          autoPlay
          className="h-auto w-full rounded-lg"
          style={{ maxHeight: '80vh' }}
        >
          <track
            kind="captions"
            src="/captions/sfn-video-captions.vtt"
            srcLang="en"
            label="English captions"
            default
          />
        </video>
      </div>
    </div>
  );
}

export default function SFNAgenda() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');

  const handleVideoClick = (videoUrl: string) => {
    setCurrentVideoUrl(videoUrl);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentVideoUrl('');
  };
  return (
    <div className="text-primary-9 relative flex w-full flex-col gap-x-4 px-8 py-12 md:flex-row md:py-[15vh]">
      <div className="relative top-0 mb-12 h-fit w-full pr-0 pl-0 md:sticky md:top-[15vh] md:mb-0 md:w-1/2 md:pr-6 md:pl-[8vw]">
        <h2 className="font-serif text-6xl! leading-[1.2]! font-normal">Agenda</h2>
        <Divider />

        <p className="font-title text-xl! leading-normal md:text-2xl!">
          Outside of our scheduled events and workshops, we warmly invite you to stop by our booth
          and explore our Virtual Labs. Our team is here throughout the day, eager to introduce you
          to our tools, answer your questions, and guide you through the possibilities of
          collaborative neuroscience. Don&apos;t hesitate to come by — we&apos;re ready to welcome
          you and help you get started.
        </p>
      </div>
      <div className="w-full md:w-1/2">
        <div className="flex flex-col gap-y-4">
          <div className="bg-neutral-1 font-title w-full rounded-full px-5 py-3 text-2xl tracking-wider uppercase">
            Morning
          </div>
          {agenda[0].map((item) => (
            <AgendaCard key={item.title} item={item} onVideoClick={handleVideoClick} />
          ))}
        </div>
        <div className="mt-24 flex flex-col gap-y-4">
          <div className="bg-neutral-1 font-title w-full rounded-full px-5 py-3 text-2xl tracking-wider uppercase">
            Afternoon
          </div>
          {agenda[1].map((item) => (
            <AgendaCard key={item.title} item={item} onVideoClick={handleVideoClick} />
          ))}
        </div>
      </div>

      {/* Video Modal */}
      <VideoModal isOpen={isModalOpen} videoUrl={currentVideoUrl} onClose={handleCloseModal} />
    </div>
  );
}
