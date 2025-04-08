import Link from 'next/link';
import { ArrowRightOutlined } from '@ant-design/icons';

import { classNames } from '@/util/utils';
import { dateColumnInfoToRender } from '@/util/date';

type Props = {
  id: string;
  vlabId: string;
  name: string;
  lastUpdate: string;
  memberCount?: number;
};

export default async function Item({ id, vlabId, name, lastUpdate, memberCount }: Props) {
  return (
    <div
      id={id}
      className={classNames(
        'animate-scale-in group overflow-hidden rounded-md border border-primary-5 bg-primary-9 shadow-xs',
        'hover:bg-primary-8'
      )}
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="mb-1 text-3xl font-bold">{name}</h3>
            <p className="text-base text-primary-2">
              Project&#39;s latest update:{' '}
              <span className="text-white">{dateColumnInfoToRender(lastUpdate).text}</span>
            </p>
          </div>

          <Link
            href={`/app/virtual-lab/lab/${vlabId}/project/${id}/home`}
            className={classNames(
              'rounded-full px-5 py-2 text-white transition-all duration-300',
              'group-hover:bg-primary-5'
            )}
          >
            Go to project
            <ArrowRightOutlined
              className={classNames(
                'ml-4 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1'
              )}
            />
          </Link>
        </div>
        <div className="my-4 h-[.5px] w-1/2 bg-primary-2" />
        <div className="mt-4 flex gap-6">
          <div className="flex items-center gap-2">
            <span className="text-base text-primary-2">
              Members:
              <span className="ml-2 font-bold text-white">{memberCount}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
