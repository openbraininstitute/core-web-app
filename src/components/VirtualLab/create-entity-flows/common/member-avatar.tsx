import { Avatar } from 'antd';
import get from 'lodash/get';
import nth from 'lodash/nth';

import { CheckCircleFilled, ClockCircleOutlined } from '@ant-design/icons';
import {
  MemberRoleMap,
  TMember,
  SIZE_MAP,
} from '@/components/VirtualLab/create-entity-flows/common/types';
import { classNames } from '@/util/utils';
import { COLOR_DICTIONARY } from '@/util/color';

export default function MemberAvatar({
  index,
  role,
  initials,
  name,
  email,
  size = 'small',
  layout = 'horizontal',
  status,
  cls,
}: TMember & {
  size?: 'small' | 'medium' | 'large';
  layout?: 'vertical' | 'horizontal';
  cls?: {
    container?: string;
    text?: string;
    role?: string;
    avatar?: string;
  };
}) {
  const color = nth(COLOR_DICTIONARY, index)?.color ?? '#fff';
  const bgColor = nth(COLOR_DICTIONARY, index)?.background ?? '#000';
  const scale = get(SIZE_MAP, size, undefined);

  return (
    <div className="flex items-center justify-between">
      <div
        className={classNames(
          'flex w-full items-center',
          layout === 'horizontal' ? 'flex-row gap-4' : 'flex-col gap-2',
          cls?.container
        )}
      >
        <Avatar
          className={classNames(
            'flex items-center justify-center text-center',
            '[&_.ant-avatar-string]:text-xl [&_.ant-avatar-string]:font-bold',
            role === 'admin' && '!rounded-none',
            scale,
            cls?.avatar
          )}
          size="large"
          shape={role === 'admin' ? 'square' : 'circle'}
          style={{ backgroundColor: bgColor, color }}
        >
          {initials}
        </Avatar>
        <div className="flex flex-1 items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h3
              className={classNames(
                'text-xl font-bold  text-primary-8',
                status !== 'pending' && 'first-letter:uppercase',
                cls?.text
              )}
            >
              {name}
              {layout === 'horizontal' && status === 'pending' && (
                <ClockCircleOutlined className="ml-2 text-white" />
              )}
              {layout === 'horizontal' && status === 'accept' && (
                <CheckCircleFilled className="ml-2 text-white" />
              )}
            </h3>
            <small
              className={classNames(
                'text-base font-light text-gray-400',
                layout === 'vertical' && 'hidden'
              )}
            >
              {email}
            </small>
          </div>
          <p
            className={classNames(
              'capitalize text-gray-500',
              layout === 'vertical' && 'hidden',
              cls?.role
            )}
          >
            {MemberRoleMap[role]}
          </p>
        </div>
      </div>
    </div>
  );
}

export function List({ members }: { members: Array<Omit<TMember, 'index'>> }) {
  return (
    <div className="space-y-6">
      {members.map(({ id, role, initials, name, email }, index) => (
        <MemberAvatar key={id} {...{ index, id, role, initials, name, email }} />
      ))}
    </div>
  );
}
