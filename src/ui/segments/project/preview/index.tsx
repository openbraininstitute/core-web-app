'use client';

import { CloseOutlined, RightOutlined } from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';

import { listProjectMembers } from '@/api/virtual-lab-svc/queries/member';
import { setUserRecentWorkspace } from '@/api/virtual-lab-svc/queries/user';
import { PeopleCommunity } from '@/components/icons/buttons';
import { config } from '@/config';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';
import { ExpandableText } from '@/ui/molecules/more-less-text';
import { Bar } from '@/ui/segments/project/metrics/metrics-skeleton';
import { makeTriggerWorkspaceConfigurationClickEvent } from '@/ui/segments/workspaces/space-manager/event';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { Member, Project } from '@/api/virtual-lab-svc/queries/types';
import type { WorkspaceContext } from '@/types/common';

function Header({ onClose, project }: { onClose: () => void; project?: Project | null }) {
  if (!project) return null;
  const { name } = project;

  return (
    <div className="flex w-full items-center justify-between py-4 text-white">
      <div className="flex flex-col items-start gap-0.5">
        <span className="text-primary-3">Project</span>
        <h2 className="text-2xl font-bold select-none">{name}</h2>
      </div>
      <Button
        type="button"
        onClick={onClose}
        variant="ghost"
        className="hover:border-primary-8/40 hover:bg-primary-8/40 h-10 w-10 transition-all duration-300 hover:border hover:text-white hover:shadow-lg hover:backdrop-blur-md"
      >
        <CloseOutlined />
      </Button>
    </div>
  );
}

function buildUsersList(users: Array<Member> | undefined) {
  return (
    users?.map((user) => {
      if (user.first_name && user.last_name) {
        return {
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
        };
      }
      return {
        id: user.id,
        name: user.username,
      };
    }) ?? []
  );
}

function Users({
  data,
  virtualLabId,
}: {
  data?: Project | null;
  virtualLabId: string | undefined;
}) {
  const { isLoading, data: result } = useQuery({
    queryKey: keyBuilder.listProjectTeam({ virtualLabId: virtualLabId!, projectId: data?.id! }),
    queryFn: () => listProjectMembers({ virtualLabId: virtualLabId!, projectId: data?.id! }),
    enabled: Boolean(virtualLabId && data?.id),
  });

  const users = buildUsersList(result?.data?.users);
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-lg text-white">
        <PeopleCommunity className="text-primary-4" />
        {Array.from({ length: 4 })
          .fill(1)
          .map((_, i) => (
            <Bar
              // eslint-disable-next-line react/no-array-index-key
              key={`loader-user-${i}`}
              aria-label="Loading label"
              className="h-3 w-20 rounded-full"
            />
          ))}
      </div>
    );
  }
  if (users.length) {
    return (
      <div className="border-primary-4 flex items-start gap-2 border-y py-1.5 text-lg text-white select-none">
        <PeopleCommunity className="text-primary-4 mt-0.5 min-h-5 min-w-5" />
        <div className="flex max-w-full flex-wrap items-center gap-1 overflow-hidden text-ellipsis">
          {users.map((user) => (
            <div
              key={user.id}
              className="after:text-white after:content-[','] last:after:content-none"
            >
              {user.name}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

function Description({ text }: { text: string | undefined }) {
  return text ? (
    <div className="flex flex-col gap-1 py-2">
      <h4 className="text-primary-3">Description</h4>
      <ExpandableText text={text} collapsedLines={3} className="pr-3 text-white">
        {({ isExpanded, toggle }) => (
          <button
            type="button"
            onClick={toggle}
            className="text-sm text-white/90 underline decoration-white/40 underline-offset-4 transition-colors hover:text-white"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </ExpandableText>
    </div>
  ) : null;
}

const shortcuts = [
  {
    key: 'browse-data',
    title: 'Data',
    url: ({ virtualLabId, projectId }: WorkspaceContext) =>
      `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data`,
  },
  {
    key: 'workflow',
    title: 'Workflows',
    url: ({ virtualLabId, projectId }: WorkspaceContext) =>
      `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows`,
  },
  {
    key: 'notebooks',
    title: 'Notebooks',
    url: ({ virtualLabId, projectId }: WorkspaceContext) =>
      `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/notebooks`,
  },
  {
    key: 'reports',
    title: 'Reports',
    url: ({ virtualLabId, projectId }: WorkspaceContext) =>
      `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/reports`,
  },
];

function Content({
  data,
  virtualLabId,
}: {
  data?: Project | null;
  virtualLabId: string | undefined;
}) {
  const breakpoint = useDefaultBreakpoint();
  const mutateRecentWorkspace = useMutation({
    mutationFn: ({ vlabId, prjId }: { vlabId: string; prjId: string }) =>
      setUserRecentWorkspace({ workspace: { virtualLabId: vlabId, projectId: prjId } }),
  });

  const onProjectClick = () => {
    if (virtualLabId && data?.id) {
      mutateRecentWorkspace.mutate({ vlabId: virtualLabId, prjId: data.id });
      makeTriggerWorkspaceConfigurationClickEvent({
        on: false,
        type: null,
        data: null,
      });
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="absolute top-0 right-0 -z-10 h-[271px] w-[577px] opacity-90">
        <Image
          src="/images/brain-visualization.png"
          alt=""
          fill
          className="scale-y-[-1] object-cover object-bottom-right"
          priority
        />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div id="project-details" className="flex flex-col gap-4">
          <Description text={data?.description} />
          <Users virtualLabId={virtualLabId!} data={data} />
        </div>
        <div id="hot-links" className="flex flex-col gap-2">
          {shortcuts.map(({ key, title, url }) => (
            <Button
              asChild
              rounded
              borderless
              key={key}
              size={breakpoint === 'l' ? 'md' : 'lg'}
              variant="default"
              onClick={onProjectClick}
              className="h-auto w-full justify-start font-semibold shadow-[0px_2px_16px_0px_#0000003D,-2px_-2px_16px_0px_#9FC4FF24]"
            >
              <Link prefetch href={url({ virtualLabId: virtualLabId!, projectId: data?.id! })}>
                {title}
                <RightOutlined className="ml-auto text-current" />
              </Link>
            </Button>
          ))}
        </div>
      </div>
      <div className="z-10 flex w-full items-center justify-end">
        <Button
          asChild
          rounded
          size={breakpoint === 'l' ? 'md' : 'lg'}
          variant="outline"
          className="group mt-10 w-full self-end font-semibold"
        >
          <Link
            prefetch
            href={`${config.ROOT_ROUTE}/${virtualLabId}/${data?.id}`}
            onClick={onProjectClick}
          >
            <div className="flex w-full items-center justify-between gap-10">
              Go to project
              <RightOutlined className="text-primary-9 group-hover:text-white!" />
            </div>
          </Link>
        </Button>
      </div>
    </div>
  );
}

type Props = {
  onClose: () => void;
  payload:
    | {
        projectId: string | null;
        data: Project | null;
      }
    | null
    | undefined;
};

export function ProjectPreview({ onClose, payload }: Props) {
  return (
    <div id="project-preview-container" className="flex flex-col">
      <div id="project-preview-header" className="z-[1002] flex px-6 py-2">
        <Header onClose={onClose} project={payload?.data} />
      </div>
      <div
        id="project-preview-content"
        className="flex-1 px-6 py-4 transition-opacity duration-200 ease-in-out"
      >
        <Content data={payload?.data} virtualLabId={payload?.data?.virtual_lab_id} />
      </div>
    </div>
  );
}
