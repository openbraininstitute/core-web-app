import Image from 'next/image';
import Link from 'next/link';
import ImagePosterPlaceholder from '../img/workshop_video_placeholder.jpg';
import { SingleWorkshopProps } from '../type';
import CalendarIcon from '@/components/icons/Calendar';
import { ArrowRightIcon } from '@/components/icons';

export default function SingleWorkshopCard({ content }: { content: SingleWorkshopProps }) {
  return (
    <div className="bg-primary-7 hover:bg-primary-6 flex h-[50vh] w-full flex-row gap-x-6 rounded-lg p-4 text-white transition-colors duration-300">
      <div className="h-full w-2/3">
        <Image
          src={ImagePosterPlaceholder}
          alt="Workshop video poster"
          className="h-full w-full rounded-lg object-cover"
        />
      </div>
      <div className="flex h-full w-1/3 flex-col items-start justify-between">
        <div className="w-full">
          <div className="flex flex-col justify-between">
            <div className="font-base mb-2 flex flex-row items-center font-normal text-white">
              <CalendarIcon className="mr-2" />
              {content.date}
            </div>
            <h3 className="text-2xl font-bold">{content.title}</h3>
          </div>
          <p className="text-primary-1 text-base leading-normal font-light">
            {content.description}
          </p>
        </div>
        <Link
          href={`/documentation/guides/${content.slug}`}
          className="border-primary-1 flex flex-row items-center justify-start border-b border-solid pb-2 text-base font-normal text-white"
        >
          Watch the workshop
          <ArrowRightIcon className="ml-3 h-3 w-auto" />
        </Link>
      </div>
    </div>
  );
}
