'use client';

import { CloseOutlined, RightOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { makeTriggerWorkspaceConfigurationClickEvent } from '@/ui/segments/workspaces/space-manager/event';
import { Bar, MetricsSkeleton } from '@/ui/segments/project/metrics/metrics-skeleton';
import { listProjectMembers } from '@/api/virtual-lab-svc/queries/member';
import { Metrics } from '@/ui/segments/project/metrics/metrics';
import { ExpandableText } from '@/ui/molecules/more-less-text';
import { PeopleCommunity } from '@/components/icons/buttons';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { V2_MIGRATION_TEMPORARY_BASE_PATH } from '@/config';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { LATEST_VISITED_PROJECT_KEY } from '@/constants';
import { Button } from '@/ui/molecules/button';

import type { Member, Project } from '@/api/virtual-lab-svc/queries/types';

function Header({ onClose, project }: { onClose: () => void; project?: Project | null }) {
  if (!project) return null;
  const { name } = project;

  return (
    <div className="flex items-center justify-between py-4 text-white">
      <h2 className="text-2xl font-bold select-none">{name}</h2>
      <Button type="button" onClick={onClose} className="h-10 w-10 hover:bg-white/10">
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
            // eslint-disable-next-line react/no-array-index-key
            <Bar key={`loader-user-${i}`} aria-label="Loading label" className="w-20" />
          ))}
      </div>
    );
  }
  if (users.length) {
    return (
      <div className="flex items-center gap-2 text-lg text-white select-none">
        <PeopleCommunity className="text-primary-4" />
        {users.map((user) => (
          <div
            key={user.id}
            className="after:text-white after:content-[','] last:after:content-none"
          >
            {user.name}
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function Description({ text }: { text: string | undefined }) {
  return text ? (
    <div className="border-primary-4 border-t border-b py-2">
      <ExpandableText text={text} collapsedLines={3} className="px-3 text-white">
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

function Content({
  data,
  virtualLabId,
}: {
  data?: Project | null;
  virtualLabId: string | undefined;
}) {
  const [, updateLatestVisitedProject] = useLocalStorage<{
    virtualLabId: string;
    projectId: string;
  } | null>(LATEST_VISITED_PROJECT_KEY, null);

  const onProjectClick = () => {
    if (virtualLabId && data?.id) {
      updateLatestVisitedProject({
        virtualLabId,
        projectId: data.id,
      });
      makeTriggerWorkspaceConfigurationClickEvent({
        on: false,
        type: null,
        data: null,
      });
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <Description text={data?.description} />
      <Users virtualLabId={virtualLabId!} data={data} />
      <Metrics
        virtualLabId={virtualLabId!}
        projectId={data?.id!}
        cls={{
          container: 'bg-primary-9 border border-primary-4 rounded-md',
          label: 'text-primary-4',
          value: 'text-white font-bold',
          content: 'text-white',
          body: 'grid grid-cols-2 items-center justify-between gap-x-20',
          error: 'text-white',
        }}
        loadingComponent={
          <MetricsSkeleton
            cls={{
              container: 'bg-primary-9 border border-primary-4 rounded-md',
              body: 'grid grid-cols-2 items-center justify-between gap-y-3 gap-x-20',
            }}
          />
        }
      />
      <div className="flex w-full items-center justify-end">
        <Button
          asChild
          rounded
          size="lg"
          variant="outline"
          className="group mt-20 w-max self-end font-semibold"
        >
          <Link
            prefetch
            href={`${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${data?.id}`}
            onClick={onProjectClick}
          >
            <div className="flex w-max items-center justify-between gap-10">
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
    <div
      id="project-preview-container"
      className="flex h-max max-h-max min-h-0 flex-col overflow-hidden"
    >
      <div
        id="project-preview-header"
        className="bg-primary-9 sticky top-0 left-0 z-[1002] px-6 py-2"
      >
        <Header onClose={onClose} project={payload?.data} />
      </div>
      <div
        id="project-preview-content"
        className="primary-scrollbar h-max min-h-0 flex-1 overflow-y-auto px-6 py-4 transition-opacity duration-200 ease-in-out"
      >
        <Content data={payload?.data} virtualLabId={payload?.data?.virtual_lab_id} />
      </div>
    </div>
  );
}
