import Link from 'next/link';
import { DownloadIcon } from '@/components/icons';

export function FullCircuitItem() {
  return (
    <div className="bg-primary-8 mx-8 flex flex-row justify-between rounded-lg p-8 shadow-xl">
      <div className="w-3/4 hyphens-auto">
        <div className="text-xl font-bold tracking-wide text-white uppercase">
          Download full circuit
        </div>
        <p className="text-primary-2 text-sm leading-normal font-light hyphens-auto">
          The complete circuit compressed in SONATA format,
          <a
            href="https://sonata-extension.readthedocs.io/en/latest/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            {' '}
            see more here
          </a>
        </p>
      </div>
      <div className="text-primary-1 flex flex-row gap-x-3 font-semibold">
        <div>130Gb</div>
        <div>h5</div>
        <Link
          href="/"
          className="border-primary-6 flex h-7 w-7 items-center justify-center border border-solid"
          aria-label="Download the full circuit"
        >
          <DownloadIcon className="text-white" />
        </Link>
      </div>
    </div>
  );
}
