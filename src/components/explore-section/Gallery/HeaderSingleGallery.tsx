import Link from 'next/link';
import { ArrowLeftIcon } from '@/components/icons';

type HeaderSingleGalleryProps = {
  title: string;
  description: string;
};

export default function HeaderSingleGallery({ title, description }: HeaderSingleGalleryProps) {
  return (
    <div className="fixed top-0 left-0 z-10 flex h-full w-1/4 flex-col p-6">
      <div className="flex flex-col">
        <h1 className="inline text-5xl leading-none font-bold text-white">{title}</h1>
        <p className="text-neutral-3 mt-2 w-2/3 leading-5 font-thin">{description}</p>
        <Link href="/explore/gallery">
          <button
            type="button"
            className="ease-liner border-b-neutral-4 mt-4 flex flex-row items-center border-b-0 border-solid bg-transparent pb-1 text-sm tracking-wider text-white uppercase transition-all duration-300 hover:border-b"
          >
            <ArrowLeftIcon className="h-2.5 w-auto" />
            <div className="ml-2 block">Back to the list</div>
          </button>
        </Link>
      </div>
    </div>
  );
}
