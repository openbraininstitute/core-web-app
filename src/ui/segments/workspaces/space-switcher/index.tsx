'use client';

import { PlusOutlined } from '@ant-design/icons';
import { RiArrowDownSLine, RiArrowRightSLine } from '@remixicon/react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { type ComponentProps, useCallback, useMemo, useRef, useState } from 'react';

import { getProject, listProjects } from '@/api/virtual-lab-svc/queries/project';
import { getUserProfile } from '@/api/virtual-lab-svc/queries/user';
import {
  getSelfVirtualLab,
  listTenantVirtualLabs,
} from '@/api/virtual-lab-svc/queries/virtual-lab';
import { UserFilled } from '@/components/icons/buttons';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Skeleton } from '@/ui/molecules/skeleton';
import {
  makeTriggerWorkspaceConfigurationClickEvent,
  type TTriggerWorkspaceConfigurationClickEvent,
  useWorkspaceConfigurationClickEvent,
  WorkspaceActions,
} from '@/ui/segments/workspaces/space-manager/event';
import { GhostRoundedIconButton } from '@/ui/segments/workspaces/space-manager/sections/elements';
import { Item } from '@/ui/segments/workspaces/space-switcher/item';
import { keyBuilder as userKeyBuilder } from '@/ui/use-query-keys/user';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

type Props = {
  className: ComponentProps<'div'>['className'];
};

type ResolveCurrentProjectNameParams = {
  projectId: string | null | undefined;
  listedProjectName?: string | null;
  activeProjectName?: string | null;
};

export function resolveCurrentProjectName({
  projectId,
  listedProjectName,
  activeProjectName,
}: ResolveCurrentProjectNameParams) {
  if (!projectId) {
    return 'Select project';
  }
  return activeProjectName || listedProjectName || null;
}

export function SpaceSwitcher({ className }: Props) {
  const breakpoint = useDefaultBreakpoint();
  const { virtualLabId, projectId } = useWorkspace();
  const workspaceProjectList = { virtualLabId: virtualLabId ?? '' };
  const activeWorkspace = {
    virtualLabId: virtualLabId ?? '',
    projectId: projectId ?? '',
  };
  const [tryingToExpand, setTryingToExpand] = useState<Set<string>>(new Set([]));
  const [expandedLabs, setExpandedLabs] = useState<Set<string>>(new Set([]));
  const [collapsedLabs, setCollapsedLabs] = useState<Set<string>>(new Set([]));
  const [currentVirtualLabId, setCurrentVirtualLabId] = useState<string | null>(null);
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { status: userStatus } = useSession();

  const onCreateProject = () =>
    makeTriggerWorkspaceConfigurationClickEvent({
      on: true,
      type: WorkspaceActions.NewProject,
      data: { mode: 'select-virtual-lab' },
    });

  const [
    { data: myLab, isLoading: myLabLoading },
    { data: virtualLabs, isLoading: labsLoading },
    { data: user, isLoading: userLoading },
  ] = useQueries({
    queries: [
      {
        queryKey: keyBuilder.myLab(),
        queryFn: async () => await getSelfVirtualLab(),
        staleTime: Number.POSITIVE_INFINITY,
        gcTime: Number.POSITIVE_INFINITY,
      },
      {
        queryKey: keyBuilder.listTenantVirtualLabs({
          order_by: 'scope',
          order_direction: 'asc',
        }),
        queryFn: async () =>
          await listTenantVirtualLabs({ order_by: 'scope', order_direction: 'asc' }),
        staleTime: Number.POSITIVE_INFINITY,
        gcTime: Number.POSITIVE_INFINITY,
      },
      {
        queryKey: userKeyBuilder.profile(),
        queryFn: getUserProfile,
        staleTime: Number.POSITIVE_INFINITY,
        gcTime: Number.POSITIVE_INFINITY,
      },
    ],
  });

  const username = user?.profile.first_name
    ? `${user.profile.first_name} ${user.profile.last_name}`
    : (user?.profile.preferred_username ?? user?.profile.email);

  const labs = virtualLabs?.data?.data;
  const myLabId = myLab?.data?.id;

  const { isLoading: projectsLoading, data: projects } = useQuery({
    queryKey: keyBuilder.listWorkspaceProjects(workspaceProjectList),
    queryFn: async () => await listProjects({ ...workspaceProjectList, page: 1, size: 40 }),
    enabled: !!virtualLabId,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  const onProfileClick = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.KeyboardEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(true);
    setBoardModalOpen(true);
    makeTriggerWorkspaceConfigurationClickEvent({
      on: true,
      type: WorkspaceActions.ProfileSettings,
      data: null,
    });
  };

  const visibleExpandedLabs = useMemo(() => {
    if (!virtualLabId || labs?.length === 0 || collapsedLabs.has(virtualLabId)) return expandedLabs;
    const nextExpandedLabs = new Set(expandedLabs);
    nextExpandedLabs.add(virtualLabId);
    return nextExpandedLabs;
  }, [collapsedLabs, expandedLabs, labs?.length, virtualLabId]);

  const visibleCurrentVirtualLabId =
    currentVirtualLabId ?? (virtualLabId && !collapsedLabs.has(virtualLabId) ? virtualLabId : null);

  const toggleLabExpansion = (labId: string, action?: 'trying' | 'opened') => {
    if (action === 'trying') {
      // add to trying state, do not show children yet
      const newTrying = new Set(tryingToExpand);
      const newCollapsed = new Set(collapsedLabs);
      newTrying.add(labId);
      newCollapsed.delete(labId);
      setTryingToExpand(newTrying);
      setCollapsedLabs(newCollapsed);
      setCurrentVirtualLabId(labId);
    } else if (action === 'opened') {
      // move from trying to expanded, show children
      const newTrying = new Set(tryingToExpand);
      const newExpanded = new Set(expandedLabs);
      const newCollapsed = new Set(collapsedLabs);

      newTrying.delete(labId);
      newExpanded.add(labId);
      newCollapsed.delete(labId);

      setTryingToExpand(newTrying);
      setExpandedLabs(newExpanded);
      setCollapsedLabs(newCollapsed);
    } else {
      // toggle behavior for closing
      const newExpanded = new Set(expandedLabs);
      const newTrying = new Set(tryingToExpand);
      const newCollapsed = new Set(collapsedLabs);

      if (visibleExpandedLabs.has(labId)) {
        newExpanded.delete(labId);
        newCollapsed.add(labId);
        setCurrentVirtualLabId(null);
      } else if (tryingToExpand.has(labId)) {
        newTrying.delete(labId);
        newCollapsed.add(labId);
        setCurrentVirtualLabId(null);
      }

      setExpandedLabs(newExpanded);
      setTryingToExpand(newTrying);
      setCollapsedLabs(newCollapsed);
    }
  };

  const currentVirtualLabName = labs?.find((lab) => lab.id === virtualLabId)?.name;

  const { data: activeProject, isLoading: activeProjectLoading } = useQuery({
    queryKey: keyBuilder.getWorkspace(activeWorkspace),
    queryFn: () => getProject(activeWorkspace),
    enabled: !!virtualLabId && !!projectId,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  const currentProjectName = resolveCurrentProjectName({
    projectId,
    listedProjectName:
      projects?.data?.data?.find((project) => project.id === projectId)?.name ?? null,
    activeProjectName: activeProject?.data?.name ?? null,
  });

  const currentProjectLabel = currentProjectName ?? (projectId ? 'Project' : 'Select project');
  const isCurrentProjectLoading =
    !!projectId && !currentProjectName && (projectsLoading || activeProjectLoading);

  useWorkspaceConfigurationClickEvent((event) => {
    if (isExpanded && event.detail.on) setBoardModalOpen(event.detail.on);
    else if (isExpanded && !event.detail.on) {
      setBoardModalOpen(event.detail.on);
      // TODO: ask for right behavior needed either to close the space switcher or to keep it open
      setIsExpanded(false);
    }
  });

  const onClick = () => setIsExpanded(true);

  const onExpandClick = (e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
    makeTriggerWorkspaceConfigurationClickEvent({
      on: false,
      data: null,
      type: null,
    });
  };

  return (
    <div className="flex items-start justify-center gap-1.5">
      <div id="workspace-switcher" className={cn('relative', className)} ref={dropdownRef}>
        <button
          id="virtual-lab-menu-banner"
          type="button"
          role="menubar"
          onClick={onClick}
          className={cn(
            'relative flex h-10 w-full items-center justify-between gap-1.5 pl-4 text-sm transition-all duration-150 ease-out',
            'hover:bg-background',
            {
              'border-neutral-2 h-16! rounded-2xl rounded-b-none border border-b-0 bg-white pr-4':
                isExpanded,
            },
            {
              'bg-background hover:shadow-sm border-neutral-2 gap-2 rounded-full border text-gray-700 hover:bg-gray-50':
                !isExpanded,
            },
            { 'z-1001': boardModalOpen },
            { 'h-12': breakpoint === 'xl' }
          )}
          aria-label={`${currentVirtualLabName}/${currentProjectLabel}`}
          disabled={labsLoading || myLabLoading || isCurrentProjectLoading}
        >
          <div
            className={cn('flex items-center justify-center gap-2', {
              hidden: isExpanded,
            })}
          >
            {/** biome-ignore lint/a11y/noStaticElementInteractions: button can not have nested buttons */}
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full',
                'hover:bg-background border-none'
              )}
              onKeyDown={onProfileClick}
              onClick={onProfileClick}
              tabIndex={-1}
              title={username}
              data-label={username}
            >
              <UserFilled className="hover:text-primary-6 text-primary-9 shrink-0 text-lg xl:text-xl" />
            </div>
            <RiArrowRightSLine className="text-primary-8 font-bold size-5" />
            {(labsLoading || myLabLoading) && !isExpanded ? (
              <Skeleton className="h-4 w-16 rounded-full" />
            ) : (
              currentVirtualLabName &&
              !isExpanded && (
                <div
                  className="group flex h-full max-w-20 items-center justify-center gap-1 overflow-hidden pl-2 select-none"
                  title={currentVirtualLabName}
                  data-label={currentVirtualLabName}
                >
                  <h3 className="text-primary-9 min-w-0 flex-1 truncate group-hover:font-bold">
                    {currentVirtualLabName}
                  </h3>
                </div>
              )
            )}
            <RiArrowRightSLine className="text-primary-8 font-bold size-5" />
          </div>
          <AnimatePresence mode="wait">
            {!isExpanded ? (
              <div
                id="breadcrumb"
                className={cn(
                  'flex w-full flex-1 items-center space-x-2 overflow-hidden rounded-full py-2 pr-2',
                  {
                    'border-neutral-2 h-16! rounded-md rounded-b-none border border-b-0 bg-white':
                      isExpanded,
                  }
                )}
              >
                {virtualLabId && (
                  <>
                    {isCurrentProjectLoading ? (
                      <Skeleton className="h-5 w-24 flex-1 rounded-full" />
                    ) : (
                      <span className="text-primary-9 min-w-0 flex-1 truncate pl-2 text-left font-bold">
                        {currentProjectLabel}
                      </span>
                    )}
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="bg-transparent inset-shadow-xs group flex size-8 items-center justify-center rounded-full"
                    >
                      {isCurrentProjectLoading ? (
                        <Skeleton className="h-4 w-4 rounded-full" />
                      ) : (
                        <RiArrowDownSLine
                          className="text-primary-9  size-5"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (boardModalOpen) return;
                            setIsExpanded((prev) => !prev);
                          }}
                        />
                      )}
                    </motion.div>
                  </>
                )}
                {!virtualLabId && <span className="text-gray-500">Select virtual lab</span>}
              </div>
            ) : (
              userStatus === 'authenticated' &&
              !userLoading && (
                <div
                  id="user-info"
                  className={cn(
                    'hover:text-primary-8! text-primary-9! flex w-full items-center justify-between gap-2'
                  )}
                >
                  <ProfileButton username={username} onProfileClick={onProfileClick} />
                  <div className="ml-2 flex shrink-0 items-center gap-2">
                    <span className="text-neutral-5 ml-2 shrink-0 text-sm">Logout</span>
                    <motion.div
                      className="bg-white inset-shadow-sm group flex size-8 items-center justify-center rounded-full"
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      onClick={onExpandClick}
                    >
                      <RiArrowDownSLine className="text-primary-9 group-hover:text-primary-8 size-5" />
                    </motion.div>
                  </div>
                </div>
              )
            )}
          </AnimatePresence>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              id="virtual-lab-menu-content"
              initial={{ opacity: 0, scaleY: 0.95, transformOrigin: 'top' }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.95 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              className={cn(
                'border-neutral-2 absolute top-full left-0 z-50 w-full overflow-hidden rounded-tr-lg rounded-b-2xl border border-t-0 bg-white',
                'relative flex flex-col pt-1 pb-2 shadow-2xl',
                'h-full max-h-[calc(100vh-5.5rem)] min-h-[calc(100vh-5.5rem)]',
                { 'rounded-t-none': isExpanded },
                { 'z-1001': boardModalOpen }
              )}
            >
              {/* list of user labs */}
              <div className="secondary-scrollbar flex max-h-[calc(100vh-7rem)] flex-col gap-1.5 overflow-y-auto rounded-md bg-white py-2">
                {labs?.map((lab, index) => (
                  <motion.div
                    key={lab.id}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02, duration: 0.1 }}
                    className={cn('flex flex-col gap-2 last:border-b-0', {
                      'rounded-t-none': isExpanded,
                    })}
                  >
                    <Item
                      key={lab.id}
                      lab={lab}
                      isUserLab={myLabId === lab.id}
                      activeProjectId={projectId}
                      isActive={virtualLabId === lab.id}
                      isOpen={visibleCurrentVirtualLabId === lab.id}
                      expandedLabs={visibleExpandedLabs}
                      tryingToExpand={tryingToExpand}
                      toggleLabExpansion={toggleLabExpansion}
                    />
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05, duration: 0.1 }}
                className="mt-auto p-4 flex items-center justify-end"
              >
                <GhostRoundedIconButton
                  label="Create new project"
                  onClick={onCreateProject}
                  icon={<PlusOutlined />}
                  classNames={{ label: 'text-primary-9 font-bold' }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default SpaceSwitcher;

function ProfileButton({
  username,
  onProfileClick,
}: {
  username?: string;
  onProfileClick: (
    e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.KeyboardEvent<HTMLDivElement>
  ) => void;
}) {
  const [isActive, setIsActive] = useState(false);
  useWorkspaceConfigurationClickEvent(
    useCallback((data: CustomEvent<TTriggerWorkspaceConfigurationClickEvent<unknown>>) => {
      const incomingType = data.detail.type;
      if (incomingType === WorkspaceActions.ProfileSettings) {
        setIsActive(true);
      }
    }, [])
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: button can't have nested buttons
    <div
      className={cn(
        'flex max-w-[calc(100%-100px)] flex-row items-center gap-1.5 rounded-full bg-white px-5 py-2 shadow-md md:h-9 lg:h-10',
        'hover:bg-background',
        { 'bg-primary-9 hover:text-primary-9 text-white hover:bg-white': isActive }
      )}
      onKeyDown={onProfileClick}
      onClick={onProfileClick}
      tabIndex={-1}
      title={username}
      data-label={username}
    >
      <UserFilled className="shrink-0 text-base text-current xl:text-lg" />
      <h3 className="line-clamp-1 min-w-0 truncate text-left text-sm font-bold">{username}</h3>
    </div>
  );
}
