'use client';

import { RightOutlined } from '@ant-design/icons';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/ui/molecules/button';
import DescriptionSection from '@/ui/segments/reports/obi-showcases/description';

import { buildPlatformLoginUrl } from '../build-platform-login-url';

import type { SanityShowcaseType } from '@/ui/segments/reports/obi-showcases/types';

export default function ShowcaseDetailContent({ project }: { project: SanityShowcaseType }) {
  return (
    <div className="min-h-screen bg-transparent">
      <div className="p-4">
        <div className="grid min-h-[60vh] w-full grid-cols-1 gap-6 rounded-xl border border-neutral-2 p-5 md:grid-cols-[240px_1fr]">
          <aside className="flex flex-col gap-2">
            <Button
              rounded
              borderless
              variant="outline"
              className="h-auto w-full justify-start bg-primary-9 font-bold text-white shadow-sm"
              size="lg"
            >
              Description
              <RightOutlined className="ml-auto text-current" />
            </Button>

            <Link
              href={buildPlatformLoginUrl(project.slug, 'artifacts')}
              className="relative flex flex-col rounded-full border px-6 py-2 transition-colors hover:bg-neutral-1"
            >
              <span className="font-bold">Check Artifacts</span>
              <span className="relative -top-1.5 text-sm text-neutral-4">on the platform</span>
            </Link>

            <Link
              href={buildPlatformLoginUrl(project.slug, 'notebooks')}
              className="relative flex flex-col rounded-full border px-6 py-2 transition-colors hover:bg-neutral-1"
            >
              <span className="font-bold">Check Notebooks</span>
              <span className="relative -top-1.5 text-sm text-neutral-4">on the platform</span>
            </Link>
          </aside>

          <main className="w-full overflow-y-auto">
            <div className="space-y-8">
              <DescriptionSection content={project} light />
            </div>
          </main>
        </div>

        <div className="relative  w-full bg-[#edf2f8] rounded-xl mt-12 flex flex-col items-start gap-6 p-20 overflow-hidden">
          <h2 className="relative z-10 text-5xl! font-normal text-primary-9">Launch your own analysis</h2>
          <Button
            rounded
            asChild
            variant="outline"
            size="lg"
            className="px-[23px] py-[13px] h-auto bg-primary-9 text-white hover:bg-[#00428b] hover:text-white border-none text-[15px]! font-semibold"
          >
            <Link href="/app/virtual-lab">Create virtual lab</Link>
          </Button>
          <Image
            src="/images/brain-visualization-v3.webp"
            alt="Brain visualization"
            className="absolute w-auto h-[220%] bottom-0 right-0 max-lg:hidden"
            width={1000}
            height={1000}
          />
        </div>
      </div>
    </div>
  );
}
