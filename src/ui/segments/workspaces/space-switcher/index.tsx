'use client';

import { DownOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import { useQueries, useQuery } from '@tanstack/react-query';
import { compact } from 'es-toolkit/compat';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getProject, listProjects } from '@/api/virtual-lab-svc/queries/project';
import { getUserActiveSubscription } from '@/api/virtual-lab-svc/queries/subscription';
import { getUserProfile } from '@/api/virtual-lab-svc/queries/user';
import { listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { LabTypeEnum } from '@/api/virtual-lab-svc/types';
import { UserFilled } from '@/components/icons/buttons';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { Skeleton } from '@/ui/molecules/skeleton';
import {
  makeTriggerWorkspaceConfigurationClickEvent,
  type TTriggerWorkspaceConfigurationClickEvent,
  useWorkspaceConfigurationClickEvent,
  WorkspaceActions,
} from '@/ui/segments/workspaces/space-manager/event';
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
  const [currentVirtualLabId, setCurrentVirtualLabId] = useState<string | null>(null);
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const pathname = usePathname();
  const { replace: navigateWithReplace } = useRouter();

  const [isExpanded, setIsExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { status: userStatus } = useSession();

  const onCreateProject = () =>
    makeTriggerWorkspaceConfigurationClickEvent({
      on: true,
      type: WorkspaceActions.NewProject,
      data: null,
    });

  const [
    { data: virtualLabs, isLoading: labsLoading },
    { data: subscription },
    { data: user, isLoading: userLoading },
  ] = useQueries({
    queries: [
      {
        queryKey: keyBuilder.listAllLabs({
          includes: [LabTypeEnum.MY_LAB, LabTypeEnum.MEMBERSHIP_LABS],
        }),
        queryFn: async () =>
          await listVirtualLabs({ include: [LabTypeEnum.MY_LAB, LabTypeEnum.MEMBERSHIP_LABS] }),
        staleTime: Number.POSITIVE_INFINITY,
        gcTime: Number.POSITIVE_INFINITY,
      },
      {
        queryKey: userKeyBuilder.subscription(),
        queryFn: getUserActiveSubscription,
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

  const myVirtualLab = useMemo(
    () =>
      virtualLabs?.data?.virtual_lab
        ? { ...virtualLabs?.data?.virtual_lab, isMine: true }
        : undefined,
    [virtualLabs]
  );

  const membershipLabs = useMemo(
    () =>
      virtualLabs?.data?.membership_labs
        ? virtualLabs?.data?.membership_labs.results.map((p) => ({
            ...p,
            isMine: false,
          }))
        : [],
    [virtualLabs]
  );

  const { isLoading: projectsLoading, data: projects } = useQuery({
    queryKey: keyBuilder.listWorkspaceProjects(workspaceProjectList),
    queryFn: async () => await listProjects({ ...workspaceProjectList, page: 1, size: 40 }),
    enabled: !!virtualLabId,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  const labs = useMemo(
    () => compact([myVirtualLab, ...membershipLabs]),
    [myVirtualLab, membershipLabs]
  );

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

  useEffect(() => {
    if (virtualLabId && labs.length > 0) {
      setCurrentVirtualLabId(virtualLabId);
      setExpandedLabs(new Set([virtualLabId]));
    } else if (!virtualLabId) {
      setCurrentVirtualLabId(null);
      setExpandedLabs(new Set([]));
    }
  }, [virtualLabId, labs.length]);

  const toggleLabExpansion = (labId: string, action?: 'trying' | 'opened') => {
    if (action === 'trying') {
      // add to trying state, do not show children yet
      const newTrying = new Set(tryingToExpand);
      newTrying.add(labId);
      setTryingToExpand(newTrying);
      setCurrentVirtualLabId(labId);
    } else if (action === 'opened') {
      // move from trying to expanded, show children
      const newTrying = new Set(tryingToExpand);
      const newExpanded = new Set(expandedLabs);

      newTrying.delete(labId);
      newExpanded.add(labId);

      setTryingToExpand(newTrying);
      setExpandedLabs(newExpanded);
    } else {
      // toggle behavior for closing
      const newExpanded = new Set(expandedLabs);
      const newTrying = new Set(tryingToExpand);

      if (expandedLabs.has(labId)) {
        newExpanded.delete(labId);
        setCurrentVirtualLabId(null);
      } else if (tryingToExpand.has(labId)) {
        newTrying.delete(labId);
        setCurrentVirtualLabId(null);
      }

      setExpandedLabs(newExpanded);
      setTryingToExpand(newTrying);
    }
  };

  const currentVirtualLabName = labs.find((lab) => lab.id === virtualLabId)?.name;

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
      projects?.data?.results.find((project) => project.id === projectId)?.name ?? null,
    activeProjectName: activeProject?.data.project.name ?? null,
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
  const onProClick = () => {
    makeTriggerWorkspaceConfigurationClickEvent({
      on: true,
      type: WorkspaceActions.ProfileSettings,
      data: { section: 'subscription' },
    });
    navigateWithReplace(`${pathname}?section=subscription`);
  };

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
          disabled={labsLoading || isCurrentProjectLoading}
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
            <RightOutlined className="text-primary-8 font-bold" />
            {labsLoading && !isExpanded ? (
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
            <RightOutlined className="text-primary-8 font-bold" />
          </div>
          <AnimatePresence mode="wait">
            {!isExpanded ? (
              <div
                id="breadcrumb"
                className={cn(
                  'flex w-full flex-1 items-center space-x-2 overflow-hidden rounded-full py-2 pr-4',
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
                    >
                      {isCurrentProjectLoading ? (
                        <Skeleton className="h-4 w-4 rounded-full" />
                      ) : (
                        <DownOutlined
                          className="text-gray-400"
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
                    <motion.div
                      className="hover:bg-white hover:shadow-[-2px_0px_20px_-3px_rgba(0,0,0,0.2)] group flex size-8 items-center justify-center rounded-full"
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      onClick={onExpandClick}
                    >
                      <DownOutlined className="text-neutral-3 group-hover:text-primary-8" />
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
              {subscription?.subscription.tier === 'FREE' && (
                <button
                  type="button"
                  aria-label="get pro subscription"
                  className="m-2 rounded-md bg-linear-to-r from-[#003A8C] to-[#2D5A99]"
                  onClick={onProClick}
                >
                  <div className="flex flex-col items-start px-4 py-2 text-left text-white">
                    <h2 className="mb-1.5 text-lg font-bold">Get your Pro plan</h2>
                    <p className="text-base font-light">
                      Discover more features, build models, launch experiments...
                    </p>
                  </div>
                </button>
              )}
              {/* list of user labs */}
              <div className="secondary-scrollbar flex max-h-[calc(100vh-7rem)] flex-col gap-1.5 overflow-y-auto rounded-md bg-white py-2">
                {labs.map((lab, index) => (
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
                      activeProjectId={projectId}
                      isActive={virtualLabId === lab.id}
                      isOpen={currentVirtualLabId === lab.id}
                      expandedLabs={expandedLabs}
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
                className="mt-auto p-4"
              >
                <Button
                  rounded
                  size="md"
                  variant="default"
                  className="w-full"
                  onClick={onCreateProject}
                >
                  Add project
                  <PlusOutlined className="ml-auto text-sm" />
                </Button>
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
