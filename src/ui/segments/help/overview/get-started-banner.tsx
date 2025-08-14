import Link from 'next/link';

import bImage from './background-help-get_started-banner.webp';

export default function GetStartedBanner() {
  return (
    <div
      className="rounded-lg bg-cover p-10 text-white"
      style={{ backgroundImage: `url(${bImage.src})` }}
    >
      <header className="mb-12">
        <h2 className="text-3xl font-bold">How to use the Open Brain Platform</h2>
        <p className="mt-1 text-base font-normal">
          Discover everything you can do with your virtual lab and your projects
        </p>
      </header>
      <Link
        href="/help/get-started"
        className="border border-solid border-white px-7 py-3 text-lg text-white"
      >
        Get Started
      </Link>
    </div>
  );
}
