import Image from 'next/image';
import Link from 'next/link';
import { basePath } from '@/config';

export default function VirtualLabExploreMainPage() {
  return (
    <div className="relative mt-5 flex h-[calc(100%-120px)] w-full items-center justify-center bg-black">
      <div className="relative flex h-4/5 w-2/3 items-center justify-center">
        <Image
          fill
          src={`${basePath}/images/green-brain.webp`}
          alt="whole-brain"
          className="object-center"
        />
      </div>
      <div className="absolute left-10 top-10 flex flex-col items-start justify-center">
        <h1 className="mb-3 text-3xl font-bold text-white">Atlas based exploration</h1>
        <p className="w-1/4 text-lg text-white">
          Browse in a 3D atlas environment to find experimental data related to the selected model
          or generated during in silico simulations by clicking on the Start exploring button.
          Search for additional research information with our AI tool by clicking on the Literature
          discovery button.
        </p>
      </div>
      <div className="absolute bottom-[30px] right-[30px]">
        <div className="flex flex-col items-center justify-center gap-3">
          <Link
            href="explore/interactive"
            className="relative w-full flex-1 border border-white px-7 py-2 text-center text-base text-white hover:bg-white hover:font-bold hover:text-primary-8 lg:text-lg xl:py-4 2xl:text-2xl"
          >
            Start exploring
          </Link>
          <Link
            href="explore/interactive/literature/morphology"
            className="relative w-full flex-1 border border-white px-7 py-2 text-center text-base text-white hover:bg-white hover:font-bold hover:text-primary-8 lg:text-lg xl:py-4 2xl:text-2xl"
          >
            Literature discovery
          </Link>
        </div>
      </div>
    </div>
  );
}
