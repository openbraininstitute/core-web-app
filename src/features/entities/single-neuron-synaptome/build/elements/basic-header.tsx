import { UserOutlined } from '@ant-design/icons';
import { useAtomValue } from 'jotai';
import { Form } from 'antd';

import { EmptyValue, renderDate } from '@/entity-configuration/definitions/renderer';
import { virtualLabProjectUsersAtomFamily } from '@/state/virtual-lab/projects';
import { label } from '@/components/form-label';
import { ensureArray } from '@/utils/array';
import { classNames } from '@/util/utils';

import type { SynaptomeModelConfiguration } from '@/types/synaptome';
import type { WorkspaceContext } from '@/types/common';

type Props = WorkspaceContext & {
  show: boolean;
};

export default function Header({ show, virtualLabId, projectId }: Props) {
  const { getFieldValue } = Form.useFormInstance<SynaptomeModelConfiguration>();
  const name: string = getFieldValue('name');
  const description: string = getFieldValue('description')?.trim() ?? '';
  const contributors = useAtomValue(virtualLabProjectUsersAtomFamily({ virtualLabId, projectId }))
    ?.data?.users;

  return (
    <div
      className={classNames(
        'opacity-0',
        show &&
          'animate-fade-in border-neutral-2 z-50 h-full border-b bg-white opacity-100 shadow-xs'
      )}
    >
      {show && (
        <div className="h-full w-full gap-5">
          <div className="flex w-full flex-col gap-4 px-10 pt-4 pb-10">
            <div className="grid grid-cols-2 gap-14">
              <div className="">
                {label('name', 'secondary')}
                <div className="text-primary-8 text-2xl font-bold">{name}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-14">
              <div className="">
                {label('description', 'secondary')}
                <div className="text-primary-8 text-justify font-normal">
                  {description.length > 0 ? description : EmptyValue}
                </div>
              </div>
              <div className="grid grid-cols-2 items-start justify-between gap-2">
                <div className="flex flex-col items-start gap-1">
                  {label('contributors', 'secondary')}
                  <div className="text-primary-8 flex flex-col items-start justify-center gap-2">
                    {ensureArray({ input: contributors }).map((user) => (
                      <div className="font-light" key={`contributor-${user.id}`}>
                        <UserOutlined className="mr-1 h-3 w-3" />
                        {user.name ?? user.username}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {label('creation date', 'secondary')}
                  <div className="text-primary-8">{renderDate(new Date().toISOString())}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
