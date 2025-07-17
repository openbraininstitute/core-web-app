'use client';

import { ChangeEvent, CSSProperties, ReactNode, useState } from 'react';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import { Button, ConfigProvider, Input } from 'antd';
import { EditOutlined, UnlockOutlined } from '@ant-design/icons';
import Link from 'next/link';

import VirtualLabMainStatistics from '@/components/VirtualLab/VirtualLabBanner/VirtualLabMainStatistics';
import useUpdateVirtualLab from '@/hooks/useUpdateVirtualLab';
import useUpdateProject from '@/hooks/useUpdateVirtualLabProject';
import { useDebouncedCallback, useLastTruthyValue, useUnwrappedValue } from '@/hooks/hooks';
import { virtualLabBalanceAtomFamily, virtualLabMembersAtomFamily } from '@/state/virtual-lab/lab';
import {
  projectBalanceAtomFamily,
  virtualLabProjectUsersAtomFamily,
} from '@/state/virtual-lab/projects';
import { VirtualLab } from '@/api/virtual-lab-svc/queries/types';
import { generateLabUrl } from '@/util/virtual-lab/urls';
import { classNames } from '@/util/utils';
import { basePath } from '@/config';
import { useAppNotification } from '@/components/notification';
import styles from './virtual-lab-banner.module.css';

function BackgroundImg({
  backgroundImage,
  children,
  className,
  style,
}: {
  backgroundImage: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={classNames('bg-primary-8 relative min-h-[250px] overflow-hidden', className)}>
      <div
        className={styles.bannerImg}
        style={{
          backgroundImage,
          ...style,
        }}
      />
      {children}
    </div>
  );
}

function useEditBtn({ dataTestid }: Partial<{ dataTestid: string }> = {}) {
  const [isEditable, setIsEditable] = useState<boolean>(false);

  const onClick = () => setIsEditable(!isEditable);
  const button = (
    <ConfigProvider
      theme={{
        components: {
          Button: {
            borderRadius: 0,
            colorPrimaryHover: '#fff',
            defaultGhostColor: '#69C0FF',
            defaultGhostBorderColor: '#69C0FF',
          },
        },
      }}
    >
      <Button
        ghost
        className="shrink-0 self-start"
        data-testid={dataTestid}
        icon={isEditable ? <UnlockOutlined /> : <EditOutlined />}
        onClick={onClick}
      />
    </ConfigProvider>
  );

  return {
    button,
    isEditable,
  };
}

function EditableInputs({
  dataTestid,
  description,
  name,
  onChange,
}: {
  dataTestid?: string;
  description?: string;
  name?: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}) {
  return (
    <ConfigProvider
      theme={{
        components: {
          Input: { borderRadius: 0, colorText: '#fff', paddingBlock: 0, paddingInline: 0 },
        },
      }}
    >
      <Input
        className="text-5xl font-bold"
        data-testid={`${dataTestid}-name-input`}
        defaultValue={name}
        maxLength={250}
        name="name"
        onChange={onChange}
        required
        style={{ background: 'rgba(255, 255, 255, 0.2)', height: 42 }}
        variant="borderless"
      />
      <Input.TextArea
        className="grow"
        data-testid={`${dataTestid}-description-input`}
        defaultValue={description}
        maxLength={288}
        name="description"
        onChange={onChange}
        style={{ background: 'rgba(255, 255, 255, 0.2)', resize: 'none' }}
        variant="borderless"
      />
    </ConfigProvider>
  );
}

function StaticValues({
  dataTestid,
  description,
  name,
}: {
  dataTestid?: string;
  description?: string;
  name?: string;
}) {
  return (
    <>
      <span className="text-5xl font-bold" data-testid={`${dataTestid}-name-element`}>
        {name}
      </span>
      <p className="max-w-[768px]" data-testid={`${dataTestid}-description-element`}>
        {description}
      </p>
    </>
  );
}

function BannerWrapper({
  admin,
  children,
  createdAt,
  label,
  userCount,
  balance,
}: {
  admin?: string;
  children?: ReactNode;
  createdAt?: string;
  label?: string;
  userCount?: number;
  balance?: number | string;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex grow flex-col gap-2">
        <div className="text-primary-2">{label}</div>
        {children}
      </div>
      <div className="mt-auto">
        <VirtualLabMainStatistics
          admin={admin}
          createdAt={createdAt}
          userCount={userCount}
          balance={balance}
        />
      </div>
    </div>
  );
}

const hippocampusImg = `url(${basePath}/images/virtual-lab/obp_hippocampus_original.webp)`;
const neocortexImg = `url(${basePath}/images/virtual-lab/obp_neocortex.webp)`;
const linkClassName = 'absolute left-0 top-0 flex h-full w-full justify-between p-8';

type Props = { createdAt?: string; description?: string; name?: string };

export function DashboardBanner({ createdAt, description, id, name }: Props & { id: string }) {
  const usersResult = useLastTruthyValue(virtualLabMembersAtomFamily(id));
  const balance = useLastTruthyValue(virtualLabBalanceAtomFamily({ virtualLabId: id }));

  const labUrl = id && generateLabUrl(id);
  const href = `${labUrl}/overview`;
  const users = usersResult?.data?.users;
  const total = usersResult?.data?.total;
  return (
    <>
      <BackgroundImg backgroundImage={hippocampusImg} className="hover:brightness-110">
        <Link className={linkClassName} href={href}>
          <BannerWrapper
            admin={users?.find((user) => user.role === 'admin')?.name || '-'}
            createdAt={createdAt}
            label="Virtual lab Name"
            userCount={total || 0}
            balance={balance?.data.balance}
          >
            <StaticValues description={description} name={name} dataTestid="dashboard-banner" />
          </BannerWrapper>
        </Link>
      </BackgroundImg>
    </>
  );
}

export function SandboxBanner({ description, name }: Omit<Props, 'createdAt'>) {
  return (
    <BackgroundImg backgroundImage={hippocampusImg}>
      <div className={linkClassName}>
        <BannerWrapper>
          <StaticValues description={description} name={name} dataTestid="sandbox-banner" />
        </BannerWrapper>
      </div>
    </BackgroundImg>
  );
}

export function LabDetailBanner({ vlab }: { vlab?: VirtualLab }) {
  const notify = useAppNotification();
  const usersResult = useUnwrappedValue(virtualLabMembersAtomFamily(vlab?.id));
  const balance = useUnwrappedValue(virtualLabBalanceAtomFamily({ virtualLabId: vlab?.id }));

  const updateVlab = useUpdateVirtualLab(vlab?.id);
  const updateDebounced = useDebouncedCallback(updateVlab, [updateVlab], 600);

  const name = vlab?.name;
  const description = vlab?.description;

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { target } = e;
    const fieldName = target.getAttribute('name');
    if (!fieldName || !vlab) return;

    const { value } = target;
    updateDebounced({ [fieldName]: value })?.catch((error) =>
      notify.error({ message: error.message })
    );
  };

  const { button: editBtn, isEditable } = useEditBtn({ dataTestid: 'lab-detail-banner-edit-btn' });
  const users = usersResult?.data?.users;
  const total = usersResult?.data?.total;
  return (
    <>
      <BackgroundImg backgroundImage={hippocampusImg}>
        <div className={linkClassName}>
          <BannerWrapper
            admin={users?.find((user) => user.role === 'admin')?.name || '-'}
            createdAt={vlab?.created_at}
            label="Virtual lab Name"
            userCount={total || 0}
            balance={balance?.data.balance}
          >
            {isEditable ? (
              <EditableInputs
                description={description}
                name={name}
                onChange={onChange}
                dataTestid="lab-detail-banner"
              />
            ) : (
              <StaticValues description={description} name={name} dataTestid="lab-detail-banner" />
            )}
          </BannerWrapper>
          {editBtn}
        </div>
      </BackgroundImg>
    </>
  );
}

function getErrorMsg(fieldName: string) {
  return `Something went wrong when attempting to update the project ${fieldName}.`;
}

export function getSuccessMsg(fieldName: string, value: string) {
  return `New project ${fieldName}: "${value}"`;
}

export const dataTestid = 'edit-project-info';

export function ProjectDetailBanner({
  createdAt,
  description,
  name,
  projectId,
  virtualLabId,
}: Props & { projectId: string; virtualLabId: string }) {
  const notify = useAppNotification();
  const usersResult = useAtomValue(
    unwrap(virtualLabProjectUsersAtomFamily({ virtualLabId, projectId }))
  );
  const balance = useUnwrappedValue(projectBalanceAtomFamily({ virtualLabId, projectId }));

  const updateProject = useUpdateProject(virtualLabId, projectId);

  const onChange = useDebouncedCallback(
    async (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { target } = e;
      const fieldName = target.getAttribute('name');
      const { value } = target;

      return (
        !!fieldName &&
        updateProject({ [fieldName as string]: value })
          .then(() => notify.success({ message: getSuccessMsg(fieldName, value) }))
          .catch(() => notify.error({ message: getErrorMsg(fieldName) }))
      );
    },
    [updateProject], // eslint-disable-line react-hooks/exhaustive-deps
    600,
    { leading: true }
  );

  const users = usersResult?.data?.users;
  const totalUsers = usersResult?.data?.total_active;
  const { button: editBtn, isEditable } = useEditBtn({
    dataTestid,
  });

  return (
    <BackgroundImg
      backgroundImage={neocortexImg}
      style={{
        backgroundSize: '50%',
        backgroundPosition: '-5% 20%',
        rotate: '215deg',
        top: '-100%',
        right: '-20%',
        left: 'auto',
        opacity: 'unset',
        mixBlendMode: 'unset',
      }}
    >
      <div className={linkClassName}>
        <BannerWrapper
          admin={users?.find((user) => user.role === 'admin')?.name || '-'}
          createdAt={createdAt}
          label="Project Name"
          userCount={totalUsers ?? 0}
          balance={balance?.balance ?? ''}
        >
          {isEditable ? (
            <EditableInputs
              dataTestid={dataTestid}
              description={description}
              name={name}
              onChange={onChange}
            />
          ) : (
            <StaticValues dataTestid={dataTestid} description={description} name={name} />
          )}
        </BannerWrapper>
        {editBtn}
      </div>
    </BackgroundImg>
  );
}
