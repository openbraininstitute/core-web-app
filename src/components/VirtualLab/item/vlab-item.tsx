import Link from 'next/link';
import { ArrowRightOutlined } from '@ant-design/icons';

import { classNames } from '@/util/utils';
import { dateColumnInfoToRender } from '@/util/date';

type Props = {
  id: string;
  name: string;
  lastUpdate: string;
  projectCount: number | null;
  memberCount: number | null;
  pending?: boolean;
};

export default function Item({
  id,
  name,
  lastUpdate,
  projectCount,
  memberCount,
  pending = false,
}: Props) {
  return (
    <div
      id={id}
      className={classNames(
        'animate-scale-in group relative mb-2 overflow-hidden rounded-md shadow-sm',
        'bg-primary-8'
      )}
    >
      <div
        className={classNames(
          'absolute inset-0',
          pending ? 'block bg-black/40' : 'hidden group-hover:block group-hover:bg-black/20'
        )}
      />
      <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="mb-1 text-3xl font-bold text-white">{name}</h3>
            <p className={classNames('text-base', pending ? 'text-white' : 'text-primary-2')}>
              {pending ? (
                <span>Virtual lab&#39;s created at:</span>
              ) : (
                <span>Virtual lab&#39;s latest update: </span>
              )}
              <span className="ml-2 text-white">{dateColumnInfoToRender(lastUpdate).text}</span>
            </p>
            {pending && (
              <em className="mt-2 text-gray-400">
                You have been invited to this virtual lab. Please accept the invitation to grant you
                access.
              </em>
            )}
          </div>

          <Link
            href={`/app/virtual-lab/lab/${id}/overview`}
            className={classNames(
              'rounded-full px-5 py-2 text-white transition-all duration-300',
              'group-hover:bg-primary-5',
              pending && 'hidden'
            )}
          >
            Go to virtual lab
            <ArrowRightOutlined
              className={classNames(
                'ml-4 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1'
              )}
            />
          </Link>
        </div>
        {(projectCount || memberCount) && <div className="my-4 h-[.5px] w-1/2 bg-primary-2" />}
        <div
          className={classNames('mt-4 gap-6', !projectCount && !memberCount ? 'hidden' : 'flex')}
        >
          <div className="flex items-center gap-2">
            <span className="text-base text-primary-2">
              Projects:
              <span className="ml-2 font-bold text-white">{projectCount ?? 0}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base text-primary-2">
              Members:
              <span className="ml-2 font-bold text-white">{memberCount ?? 0}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
