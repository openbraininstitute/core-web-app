import Link from 'next/link';
import { SingleGuideProps } from '../type';
import { ArrowRightIcon, GuideIcon } from '@/components/icons';

export default function SingleGuideCard({ content }: { content: SingleGuideProps }) {
  return (
    <Link
      href={`/documentation/guides/${content.slug}`}
      className="ease-in-our flex w-full flex-col items-start rounded-lg bg-primary-7 p-4 text-white transition-colors duration-300 hover:bg-primary-6"
    >
      <header className="relative mb-3 flex flex-row items-center">
        <GuideIcon className="mr-2 h-auto w-4" iconColor="white" />
        <h2 className="text-2xl font-bold">{content.title}</h2>
      </header>
      <p className="mb-4 text-base leading-normal text-primary-1">{content.description}</p>
      <Link
        href={`/documentation/guides/${content.slug}`}
        className="flex flex-row items-center justify-start border-b border-solid border-primary-1 pb-2 text-base font-normal text-white"
      >
        Read the guide
        <ArrowRightIcon className="ml-3 h-3 w-auto" />
      </Link>
    </Link>
  );
}
