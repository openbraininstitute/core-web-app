import Image from 'next/image';
import Link from 'next/link';

export default function HeaderHome() {
  return (
    <div className="relative w-full overflow-hidden bg-cover bg-center p-8 text-white">
      <div className="relative z-10">
        <h1 className="text-3xl font-bold">Get started with your Virtual Lab</h1>
        <p className="mb-6 text-base leading-normal font-normal">
          Discover everything you can do with your virtual lab and your projects
        </p>
        <Link
          href="/app/virtual-lab"
          className="border border-solid border-white px-4 py-2 text-base font-normal text-white"
        >
          Get started
        </Link>
      </div>
      <div className="absolute top-0 left-0 z-0 h-full w-full">
        <Image
          src="/images/documentation/documentation_image_header.jpg"
          alt="Documentation Header"
          objectFit="cover"
          className="relative h-auto w-full"
          width={883}
          height={233}
        />
      </div>
    </div>
  );
}
