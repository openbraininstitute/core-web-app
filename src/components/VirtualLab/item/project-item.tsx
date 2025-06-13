import { ArrowRightOutlined } from '@ant-design/icons';
import Link from 'next/link';

import { useLastTruthyValue } from '@/hooks/hooks';
import { projectBalanceAtomFamily } from '@/state/virtual-lab/projects';
import { dateColumnInfoToRender } from '@/util/date';
import { classNames } from '@/util/utils';

type Props = {
  id: string;
  vlabId: string;
  name: string;
  description: string;
  creationDate: string;
  memberCount?: number;
};

export default function Item({ id, description, vlabId, name, creationDate, memberCount }: Props) {
  const virtualLabBalance = useLastTruthyValue(
    projectBalanceAtomFamily({ virtualLabId: vlabId, projectId: id })
  );
  const balance = virtualLabBalance?.balance ?? 0;
  return (
    <div
      id={id}
      className={classNames(
        'animate-scale-in group border-primary-5 bg-primary-9 overflow-hidden rounded-md border shadow-xs',
        'hover:bg-primary-8'
      )}
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="mb-1 text-3xl font-bold">{name}</h3>
            <p className="text-primary-2 text-base">
              Project creation date:{' '}
              <span className="text-white">{dateColumnInfoToRender(creationDate).text}</span>
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

        {description ? (
          <p className="mt-4 mb-4 flex max-w-2xl gap-6 text-justify text-balance">{description}</p>
        ) : (
          <div className="bg-primary-2 my-4 h-[.5px] w-1/2" />
        )}
        <div className="flex gap-5">
          <div className="flex items-center gap-2">
            <span className="text-primary-2 text-base">
              Members:
              <span className="ml-2 font-bold text-white">{memberCount}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-primary-2 text-base">
              Credit balance:
              <span className="ml-2 font-bold text-white">{balance}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
