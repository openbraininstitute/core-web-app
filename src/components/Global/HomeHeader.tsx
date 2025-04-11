import Link from 'next/link';
import { ArrowLeftIcon } from '../icons';

type HomeHeaderProps = {
  title: string;
  description: string;
  link?: string;
  buttonLabel?: string;
};

export default function HomeHeader({
  title,
  description,
  link = '/',
  buttonLabel = 'Back home',
}: HomeHeaderProps) {
  return (
    <div className="fixed top-0 left-0 z-10 flex h-full w-1/3 flex-col p-6">
      <div className="flex flex-col">
        <h1 className="inline text-5xl font-bold text-white">{title}</h1>
        <p className="text-primary-2 mt-2 w-2/3 leading-5 font-thin">{description}</p>
        <Link href={link}>
          <button
            type="button"
            className="ease-liner border-primary-2 text-primary-2 hover:bg-primary-2 hover:text-primary-9 mt-4 flex flex-row items-center border bg-transparent px-6 py-4 text-sm tracking-wider uppercase transition-all duration-300"
          >
            <ArrowLeftIcon className="h-2.5 w-auto" />
            <div className="ml-2 block">{buttonLabel}</div>
          </button>
        </Link>
      </div>
    </div>
  );
}
