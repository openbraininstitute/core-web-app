import Link from 'next/link';
import { ArrowLeftOutlined } from '@ant-design/icons';

import Content from '@/components/VirtualLab/create-entity-flows/virtual-lab/content';

export default function Flow() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      <div className="mx-auto flex h-full w-full grow flex-col">
        <div className="flex h-full w-full grow flex-col">
          <div className="relative flex max-h-max w-full grow items-center gap-4 bg-primary-9 px-6 py-6">
            <Link
              href="/app/virtual-lab"
              className="absolute left-6 top-4 py-2 text-xl font-bold text-white"
            >
              <ArrowLeftOutlined />
            </Link>
            <div className="flex grow justify-center text-white">
              <h1 className="select-none text-2xl font-bold uppercase tracking-wide">
                Virtual lab creation
              </h1>
            </div>
          </div>
          <Content />
        </div>
      </div>
    </div>
  );
}
