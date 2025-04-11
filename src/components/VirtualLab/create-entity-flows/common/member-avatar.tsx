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
import { PendingInvite } from '@/components/icons/EditorIcons';

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
            role === 'admin' && 'rounded-none!',
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
                'text-primary-8 text-xl font-bold',
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
              'text-gray-500 capitalize',
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

export function MemberAvatarCasual({
  index,
  pending = false,
  role,
  initials,
  name,
  email,
  size = 'small',
  layout = 'horizontal',
  status,
  shape,
  cls,
  withEmail = false,
}: TMember & {
  pending: boolean;
  shape?: 'circle' | 'square';
  size?: 'small' | 'medium' | 'large';
  layout?: 'vertical' | 'horizontal';
  withEmail?: boolean;
  cls?: {
    container?: string;
    text?: string;
    role?: string;
    avatar?: string;
    email?: string;
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
        {pending ? (
          <div className="flex items-center justify-center gap-2">
            <PendingInvite width={48} height={48} />
            <div
              className={classNames(
                'text-primary-8 text-xl font-bold',
                !pending && 'first-letter:uppercase',
                cls?.text
              )}
            >
              <div> {email} </div>
              <div className="text-sm capitalize">{MemberRoleMap[role]}</div>
            </div>
          </div>
        ) : (
          <>
            <Avatar
              className={classNames(
                'flex items-center justify-center text-center',
                '[&_.ant-avatar-string]:text-xl [&_.ant-avatar-string]:font-bold',
                shape === 'square' && 'rounded-none!',
                scale,
                cls?.avatar
              )}
              size="large"
              shape={shape}
              style={{ backgroundColor: bgColor, color }}
            >
              {initials}
            </Avatar>
            <div className="flex flex-1 items-center justify-between gap-4">
              <div className={classNames('flex flex-col')}>
                <h3
                  className={classNames(
                    'text-primary-8 text-xl font-bold',
                    status !== 'pending' && 'first-letter:uppercase',
                    cls?.text
                  )}
                >
                  {name}
                </h3>
                {withEmail && (
                  <p className={classNames('text-sm font-light', cls?.email)}> {email}</p>
                )}
              </div>
            </div>
          </>
        )}
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
