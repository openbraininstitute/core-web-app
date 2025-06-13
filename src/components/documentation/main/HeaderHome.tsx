import Link from 'next/link';

export default function HeaderHome() {
  return (
    <div className="bg-documentationHome w-full overflow-hidden bg-cover bg-center p-8 text-white">
      <h1 className="text-3xl font-bold">Get started with your Virtual Lab</h1>
      <p className="mb-6 text-base leading-normal font-normal">
        Discover everything you can do with your virtual lab and your projects
      </p>
      <Link
        href="/app/virtual-lab"
        className="border border-solid border-white px-4 py-2 text-base font-normal"
      >
        Get started
      </Link>
    </div>
  );
}
