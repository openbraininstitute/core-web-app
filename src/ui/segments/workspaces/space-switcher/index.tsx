'use client';

import { RiArrowDownSLine, RiArrowRightSLine, RiCheckFill, RiFileCopyLine } from '@remixicon/react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getProject, listProjects } from '@/api/virtual-lab-svc/queries/project';
import { getUserProfile } from '@/api/virtual-lab-svc/queries/user';
import { getSelfVirtualLab, listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { UserFilled } from '@/components/icons/buttons';
import { SignOutFill } from '@/components/icons/EditorIcons';
import { useCopyToClipboard } from '@/hooks/useCopyClipboard';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Skeleton } from '@/ui/molecules/skeleton';
import {
  makeTriggerWorkspaceConfigurationClickEvent,
  type TTriggerWorkspaceConfigurationClickEvent,
  useWorkspaceConfigurationClickEvent,
  WorkspaceActions,
  type WorkspaceActionType,
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
  const [activeModal, setActiveModal] = useState<{
    type: WorkspaceActionType;
    virtualLabId: string | null;
    projectId: string | null;
  } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { status: userStatus, data: sessionData } = useSession();
  const [, copyAccessToken, , copying] = useCopyToClipboard();

  const onCopyToken = () => {
    if (sessionData?.accessToken) void copyAccessToken(sessionData.accessToken);
  };

  const labFilters = {
    scope: 'all',
    order_by: 'owner',
    order_direction: 'asc',
  } as const;
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
          filters: labFilters,
        }),
        queryFn: async () => await listVirtualLabs({ filters: labFilters }),
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

  const labs = virtualLabs?.data;
  const myLabId = myLab?.data?.id;

  const { isLoading: projectsLoading, data: projects } = useQuery({
    queryKey: keyBuilder.listWorkspaceProjects(workspaceProjectList),
    queryFn: async () =>
      // TODO: do not fetch by fixed page_size
      // make it loop through pages until it gets all projects
      await listProjects({ ...workspaceProjectList, pagination: { page: 1, page_size: 40 } }),
    enabled: !!virtualLabId,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  const onUserClick = () => {
    setIsExpanded(true);
    makeTriggerWorkspaceConfigurationClickEvent({
      on: true,
      type: WorkspaceActions.ProfileSettings,
      data: null,
    });
  };

  const onVlabBannerClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (!virtualLabId) return;
    setIsExpanded(true);
    makeTriggerWorkspaceConfigurationClickEvent({
      on: true,
      type: WorkspaceActions.VirtualLabConfiguration,
      data: { virtualLabId, data: { id: virtualLabId } },
    });
  };

  const onProjectBannerClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (!virtualLabId || !projectId) return;
    setIsExpanded(true);
    makeTriggerWorkspaceConfigurationClickEvent({
      on: true,
      type: WorkspaceActions.ProjectPreview,
      data: { virtualLabId, projectId, data: { id: projectId, virtual_lab_id: virtualLabId } },
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
    listedProjectName: projects?.data?.find((project) => project.id === projectId)?.name ?? null,
    activeProjectName: activeProject?.name ?? null,
  });

  const currentProjectLabel = currentProjectName ?? (projectId ? 'Project' : 'Select project');
  const isCurrentProjectLoading =
    !!projectId && !currentProjectName && (projectsLoading || activeProjectLoading);

  // Modals are decoupled from the panel: opening/closing a modal only tracks
  // which trigger is active (for elevation + selection state); it never
  // collapses the workspace panel.
  useWorkspaceConfigurationClickEvent(
    useCallback((event: CustomEvent<TTriggerWorkspaceConfigurationClickEvent<unknown>>) => {
      if (!event.detail.on || !event.detail.type) {
        setActiveModal(null);
        return;
      }
      const payload = event.detail.data as {
        virtualLabId?: string | null;
        projectId?: string | null;
        data?: { id?: string | null; virtual_lab_id?: string | null } | null;
      } | null;
      setActiveModal({
        type: event.detail.type,
        virtualLabId: payload?.virtualLabId ?? payload?.data?.virtual_lab_id ?? null,
        projectId: payload?.projectId ?? payload?.data?.id ?? null,
      });
    }, [])
  );
  const boardModalOpen = activeModal !== null;
  // Banner segments highlight only when the open modal targets the *current*
  // workspace lab/project (not a different card selected from the panel).
  const profileActive = activeModal?.type === WorkspaceActions.ProfileSettings;
  const vlabSegmentActive =
    activeModal?.type === WorkspaceActions.VirtualLabConfiguration &&
    activeModal.virtualLabId === virtualLabId;
  const projectSegmentActive =
    activeModal?.type === WorkspaceActions.ProjectPreview && activeModal.projectId === projectId;

  // closing the panel collapses every lab card; the active lab re-expands on
  // its own (empty sets => visibleExpandedLabs auto-includes virtualLabId)
  const collapsePanel = useCallback(() => {
    setExpandedLabs(new Set());
    setTryingToExpand(new Set());
    setCollapsedLabs(new Set());
    setCurrentVirtualLabId(null);
    setIsExpanded(false);
  }, []);

  const onTogglePanel = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (isExpanded) {
      collapsePanel();
    } else {
      setIsExpanded(true);
    }
  };

  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);
  useEffect(() => {
    if (previousPathnameRef.current !== pathname) {
      previousPathnameRef.current = pathname;
      collapsePanel();
    }
  }, [pathname, collapsePanel]);

  return (
    <div
      className={cn('relative flex items-start justify-center gap-1.5', {
        'z-1001': boardModalOpen,
      })}
    >
      <div id="workspace-switcher" className={cn('relative', className)} ref={dropdownRef}>
        <div
          id="virtual-lab-menu-banner"
          role="menubar"
          className={cn(
            'relative flex h-10 w-full items-center gap-1.5 pl-2 pr-4 text-sm transition-all duration-150 ease-out',
            {
              'border-neutral-2 h-16! rounded-2xl rounded-b-none border border-b-0 bg-white shadow-2xl':
                isExpanded,
            },
            {
              'bg-background hover:shadow-sm border-neutral-2 rounded-full border text-gray-700':
                !isExpanded,
            },
            { 'h-12': breakpoint === 'xl' }
          )}
          aria-label={`${currentVirtualLabName}/${currentProjectLabel}`}
        >
          <UserIconButton
            username={username}
            onClick={onUserClick}
            active={profileActive}
            hidden={userStatus !== 'authenticated' || userLoading}
          />
          {!virtualLabId ? (
            <span className="text-gray-500">Select virtual lab</span>
          ) : (
            <>
              {labsLoading || myLabLoading ? (
                <Skeleton className="h-4 w-16 rounded-full" />
              ) : (
                <button
                  type="button"
                  id="current-virtual-lab-name"
                  data-testid="current-virtual-lab-name"
                  onClick={onVlabBannerClick}
                  title={currentVirtualLabName}
                  className={cn(
                    'group flex h-7 max-w-28 shrink-0 items-center overflow-hidden rounded-full px-2 transition-colors select-none',
                    { 'bg-primary-9! text-white': vlabSegmentActive }
                  )}
                >
                  <h3
                    className={cn('min-w-0 truncate font-medium group-hover:font-bold', {
                      'text-white!': vlabSegmentActive,
                      'text-primary-9': !vlabSegmentActive,
                    })}
                  >
                    {currentVirtualLabName}
                  </h3>
                </button>
              )}
              <RiArrowRightSLine className="text-primary-8 size-5 shrink-0" />
              {isCurrentProjectLoading ? (
                <Skeleton className="h-5 w-24 flex-1 rounded-full" />
              ) : (
                <button
                  type="button"
                  id="current-project-name"
                  data-testid="current-project-name"
                  onClick={onProjectBannerClick}
                  title={currentProjectLabel}
                  className={cn(
                    'min-w-0 flex-1 truncate rounded-full px-3 py-1 text-left font-bold transition-colors',
                    projectSegmentActive
                      ? 'bg-primary-9! text-white'
                      : 'text-primary-9 hover:underline'
                  )}
                >
                  {currentProjectLabel}
                </button>
              )}
              <motion.button
                type="button"
                aria-label="toggle-workspace-panel"
                data-testid="toggle-workspace-panel"
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="bg-transparent group flex size-8 shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-40"
                onClick={onTogglePanel}
                disabled={boardModalOpen}
              >
                <RiArrowDownSLine className="text-primary-9 size-5" />
              </motion.button>
            </>
          )}
        </div>

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
                { 'rounded-t-none': isExpanded }
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
                className="border-gray-100 mt-auto grid w-full grid-cols-2 gap-2 border-t p-4 pb-2"
              >
                <GhostRoundedIconButton
                  type="button"
                  label="Copy token"
                  onClick={onCopyToken}
                  icon={
                    copying ? (
                      <RiCheckFill className="size-5! text-emerald-600! hover:text-emerald-700!" />
                    ) : (
                      <RiFileCopyLine className="size-3.5" />
                    )
                  }
                  size="responsive"
                  className="shrink-0 sm:max-w-[min(100%,14rem)]"
                  classNames={{
                    label: 'text-base font-semibold text-primary-9',
                    iconWrapper: 'border-neutral-2/80',
                    root: 'min-w-0 flex-1 justify-between pl-4! pr-2!',
                  }}
                />
                <GhostRoundedIconButton
                  href="/app/log-out"
                  prefetch={false}
                  label="Logout"
                  icon={<SignOutFill className="size-3.5" />}
                  size="responsive"
                  className="min-w-0 flex-1"
                  classNames={{
                    label: 'text-base font-semibold text-white',
                    iconWrapper: 'text-white hover:bg-primary-8',
                    root: 'group min-w-0 flex-1 justify-between pr-2! pl-4! bg-primary-9 text-white hover:bg-primary-8',
                  }}
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

function UserIconButton({
  username,
  onClick,
  active,
  hidden,
}: {
  username?: string;
  onClick: () => void;
  active?: boolean;
  hidden?: boolean;
}) {
  if (hidden) return null;

  return (
    <button
      type="button"
      id="user-profile-button"
      data-testid="user-profile-button"
      onClick={onClick}
      title={username}
      data-label={username}
      aria-label={username}
      className={cn(
        'border-neutral-2 bg-white relative flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors hover:shadow-sm xl:size-8',
        { 'bg-primary-9! hover:bg-primary-8!': active }
      )}
    >
      <UserFilled
        className={cn('text-primary-9 text-base xl:text-lg', { 'text-white!': active })}
      />
    </button>
  );
}
