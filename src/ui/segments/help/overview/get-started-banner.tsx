import Link from 'next/link';

import { cn } from '@/utils/css-class';
import styles from './get-started-banner.module.css';

export default function GetStartedBanner() {
  return (
    <div className={cn('rounded-lg p-10 text-white', styles.card)}>
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
