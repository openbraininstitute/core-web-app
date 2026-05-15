'use client';

import { CloseOutlined, RightOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState, ViewTransition } from 'react';
import { match } from 'ts-pattern';

import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { config } from '@/config';
import { Button } from '@/ui/molecules/button';
import { Modal } from '@/ui/molecules/modal';
import {
  type TWorkspaceManagerCreditsPanel,
  type TWorkspaceManagerKind,
  WorkspaceManagerCreditsPanelDict,
  WorkspaceManagerKindDict,
  WorkspaceManagerSectionDict,
} from '@/ui/segments/workspaces/space-manager/constants';
import { makeTriggerWorkspaceConfigurationClickEvent } from '@/ui/segments/workspaces/space-manager/event';
import {
  handleWorkspacePanelMenuItemSelect,
  handleWorkspacePanelSectionSelect,
} from '@/ui/segments/workspaces/space-manager/navigation';
import {
  AccountContent,
  type TActiveSection as TAccountActiveSection,
} from '@/ui/segments/workspaces/space-manager/sections/account';
import { PanelTabs, type TabItem } from '@/ui/segments/workspaces/space-manager/sections/elements';
import {
  ProjectContent,
  type TActiveSection as TProjectActiveSection,
} from '@/ui/segments/workspaces/space-manager/sections/project';
import {
  type TActiveSection as TVirtualLabActiveSection,
  VirtualLabContent,
} from '@/ui/segments/workspaces/space-manager/sections/virtual-lab';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import type { CSSProperties } from 'react';

const showExperimentalFeatures = config.DEPLOYMENT_ENV !== 'production';

const AccountTabsDict: Array<TabItem> = [
  { key: WorkspaceManagerSectionDict.Profile, label: 'Profile' },
  { key: WorkspaceManagerSectionDict.Subscription, label: 'Subscription' },
  { key: WorkspaceManagerSectionDict.Invoices, label: 'Invoices' },
  ...(showExperimentalFeatures
    ? [
        {
          key: WorkspaceManagerSectionDict.ExperimentalFeatures,
          label: 'Feature Flags',
        },
      ]
    : []),
];

const VirtualLabTabsDict: Array<TabItem> = [
  { key: WorkspaceManagerSectionDict.Overview, label: 'Overview' },
  { key: WorkspaceManagerSectionDict.Members, label: 'Administrators' },
  {
    key: WorkspaceManagerSectionDict.Credits,
    label: 'Credits',
    menuItems: [
      { key: WorkspaceManagerCreditsPanelDict.Buy, label: 'Buy credits' },
      { key: WorkspaceManagerCreditsPanelDict.Transfer, label: 'Transfer credits' },
      { key: WorkspaceManagerCreditsPanelDict.History, label: 'History' },
    ],
  },
];

const ProjectTabsDict: Array<TabItem> = [
  { key: WorkspaceManagerSectionDict.Overview, label: 'Overview' },
  { key: WorkspaceManagerSectionDict.Members, label: 'Members' },
  { key: WorkspaceManagerSectionDict.Activities, label: 'Activities' },
];

type Props = {
  kind: TWorkspaceManagerKind;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  section?: string;
  targetProjectId?: string;
  targetVirtualLabId?: string;
  virtualLabId: string;
};

type FullWidthInputs = {
  activeSection: string;
  kind: TWorkspaceManagerKind;
  isContentExpanded: boolean;
};

type FooterInputs = Pick<Props, 'kind' | 'targetProjectId' | 'targetVirtualLabId'> & {
  activeSection: string;
};

const ValidSectionByKind: Record<TWorkspaceManagerKind, ReadonlySet<string>> = {
  [WorkspaceManagerKindDict.Account]: new Set([
    WorkspaceManagerSectionDict.Profile,
    WorkspaceManagerSectionDict.Subscription,
    WorkspaceManagerSectionDict.Invoices,
    ...(showExperimentalFeatures ? [WorkspaceManagerSectionDict.ExperimentalFeatures] : []),
  ]),
  [WorkspaceManagerKindDict.VirtualLab]: new Set([
    WorkspaceManagerSectionDict.Overview,
    WorkspaceManagerSectionDict.Members,
    WorkspaceManagerSectionDict.Credits,
  ]),
  [WorkspaceManagerKindDict.Project]: new Set([
    WorkspaceManagerSectionDict.Overview,
    WorkspaceManagerSectionDict.Members,
    WorkspaceManagerSectionDict.Activities,
    WorkspaceManagerSectionDict.New,
  ]),
};

function isSectionValidForKind(kind: TWorkspaceManagerKind, value: string): boolean {
  return ValidSectionByKind[kind].has(value);
}

function resolveActiveSection(
  kind: TWorkspaceManagerKind,
  localSection: string | undefined,
  activeProjectSection: string,
  propSection: string | undefined
): string {
  return match(kind)
    .with(
      WorkspaceManagerKindDict.VirtualLab,
      () => localSection ?? propSection ?? WorkspaceManagerSectionDict.Overview
    )
    .with(
      WorkspaceManagerKindDict.Account,
      () => localSection ?? propSection ?? WorkspaceManagerSectionDict.Profile
    )
    .with(WorkspaceManagerKindDict.Project, () => activeProjectSection)
    .exhaustive();
}

function resolveTabs(
  kind: TWorkspaceManagerKind,
  targetProjectId: string | undefined,
  targetVirtualLabId: string | undefined
): Array<TabItem> {
  return match(kind)
    .with(WorkspaceManagerKindDict.Account, () => AccountTabsDict)
    .with(WorkspaceManagerKindDict.VirtualLab, () => VirtualLabTabsDict)
    .with(WorkspaceManagerKindDict.Project, () =>
      targetProjectId && targetVirtualLabId ? ProjectTabsDict : []
    )
    .exhaustive();
}

function resolveShouldUseFullWidth({
  activeSection,
  kind,
  isContentExpanded,
}: FullWidthInputs): boolean {
  return match({ activeSection, kind, isContentExpanded })
    .with(
      {
        kind: WorkspaceManagerKindDict.Project,
        activeSection: WorkspaceManagerSectionDict.Activities,
      },
      () => true
    )
    .with(
      {
        kind: WorkspaceManagerKindDict.Account,
        activeSection: WorkspaceManagerSectionDict.Subscription,
        isContentExpanded: true,
      },
      () => true
    )
    .otherwise(() => false);
}

type WaveTabProps = {
  kind: TWorkspaceManagerKind;
  virtualLabId: string;
  projectId?: string;
  targetVirtualLabId?: string;
  activeSection: string;
  onClose: () => void;
};

function WorkspaceMenuHeader({
  kind,
  virtualLabId,
  projectId,
  targetVirtualLabId,
  activeSection,
  onClose,
}: WaveTabProps) {
  const isNewProject =
    kind === WorkspaceManagerKindDict.Project && activeSection === WorkspaceManagerSectionDict.New;
  const isExistingProject =
    kind === WorkspaceManagerKindDict.Project &&
    Boolean(projectId) &&
    activeSection !== WorkspaceManagerSectionDict.New;
  const isVirtualLab = kind === WorkspaceManagerKindDict.VirtualLab;
  const shouldRender = isVirtualLab || isExistingProject || isNewProject;

  const labIdForQuery = isNewProject && targetVirtualLabId ? targetVirtualLabId : virtualLabId;

  const projectQuery = useQuery({
    queryKey: keyBuilder.getWorkspace({ virtualLabId, projectId: projectId ?? '' }),
    queryFn: () => getProject({ virtualLabId, projectId: projectId as string }),
    enabled: isExistingProject,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  const labQuery = useQuery({
    queryKey: keyBuilder.getOneLab({ virtualLabId: labIdForQuery }),
    queryFn: () => getVirtualLab({ id: labIdForQuery }),
    enabled:
      Boolean(labIdForQuery) &&
      shouldRender &&
      (isVirtualLab || isExistingProject || (isNewProject && Boolean(targetVirtualLabId))),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  if (!shouldRender) return null;

  const labName = labQuery.data?.name ?? '';
  const projectName = projectQuery.data?.name ?? '';
  const mainName = isNewProject
    ? targetVirtualLabId
      ? labName
      : 'Create new project'
    : isExistingProject
      ? projectName
      : labName;
  const eyebrow = isNewProject
    ? targetVirtualLabId
      ? 'Virtual Lab'
      : 'Project'
    : isExistingProject
      ? labName || 'Virtual Lab'
      : 'Virtual Lab';

  const eyebrowPending =
    (isVirtualLab || isExistingProject || (isNewProject && Boolean(targetVirtualLabId))) &&
    !labName &&
    labQuery.isLoading;

  const mainLinePending = isNewProject
    ? Boolean(targetVirtualLabId) && labQuery.isLoading
    : isExistingProject
      ? projectQuery.isLoading
      : labQuery.isLoading;

  return (
    <section
      aria-label={
        isNewProject && !targetVirtualLabId
          ? 'Create new project'
          : isExistingProject
            ? `Project: ${projectName}`
            : `Virtual Lab: ${labName}`
      }
      className="relative rounded-xl  mb-3 flex h-18 shrink-0 items-center justify-between gap-4 bg-white px-4"
      data-testid="workspace-manager-wave-tab"
      id="workspace-manager-wave-tab"
    >
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span
          className="truncate text-[11px] font-light uppercase tracking-[0.14em] text-primary-9"
          title={eyebrow}
        >
          {eyebrowPending ? '\u2026' : eyebrow}
        </span>
        <span className="truncate text-sm font-bold text-primary-9" title={mainName}>
          {mainLinePending && !mainName ? '\u2026' : mainName || '\u00A0'}
        </span>
      </div>

      <Button
        type="button"
        aria-label="Close workspace manager"
        variant="icon"
        size="md"
        rounded
        className={cn(
          'text-primary-9 hover:bg-white hover:shadow-sm',
          'shrink-0 border border-gray-200 bg-white text-xl shadow-none hover:text-primary-9'
        )}
        data-testid="workspace-manager-modal-close"
        id="workspace-manager-modal-close"
        onClick={onClose}
      >
        <CloseOutlined />
      </Button>
    </section>
  );
}

export function WorkspaceManagerModal({
  kind,
  onOpenChange,
  open = true,
  section,
  targetProjectId,
  targetVirtualLabId,
  virtualLabId,
}: Props) {
  const [localSection, setLocalSection] = useState<string | undefined>(section);

  const [creditsPanel, setCreditsPanel] = useState<TWorkspaceManagerCreditsPanel>(
    WorkspaceManagerCreditsPanelDict.History
  );

  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [switcherRight, setSwitcherRight] = useState<number | null>(null);
  const activeVirtualLabId = targetVirtualLabId ?? virtualLabId;

  useEffect(() => {
    setLocalSection(section);
  }, [section]);

  const sanitizedLocalSection =
    localSection !== undefined && isSectionValidForKind(kind, localSection)
      ? localSection
      : undefined;

  const activeProjectSection = sanitizedLocalSection ?? (targetProjectId ? 'overview' : 'new');
  const activeSection = resolveActiveSection(
    kind,
    sanitizedLocalSection,
    activeProjectSection,
    section
  );

  const tabs = resolveTabs(kind, targetProjectId, targetVirtualLabId);

  const waveTabVisible =
    kind === WorkspaceManagerKindDict.VirtualLab ||
    (kind === WorkspaceManagerKindDict.Project &&
      (activeSection === WorkspaceManagerSectionDict.New || Boolean(targetProjectId)));

  const panelNavigationCtx = useMemo(
    () => ({
      activeSection,
      creditsPanel,
      kind,
      setCreditsPanel,
      setIsContentExpanded,
      setLocalSection,
    }),
    [activeSection, creditsPanel, kind]
  );

  const onPanelSectionSelect = useCallback(
    (sectionKey: string) => handleWorkspacePanelSectionSelect(sectionKey, panelNavigationCtx),
    [panelNavigationCtx]
  );

  const onPanelMenuItemSelect = useCallback(
    (args: { itemKey: string; tabKey: string }) =>
      handleWorkspacePanelMenuItemSelect(args, panelNavigationCtx),
    [panelNavigationCtx]
  );

  const routeKey = `${kind}-${activeSection}-${activeVirtualLabId}-${targetProjectId ?? ''}`;

  const shouldUseFullWidth = resolveShouldUseFullWidth({
    kind,
    activeSection,
    isContentExpanded,
  });

  const modalWidth = shouldUseFullWidth
    ? 'calc(100vw - 25.1rem)'
    : 'min(39rem, calc(100vw - 26.6rem))';

  const modalLeft = switcherRight === null ? '25.85rem' : `${Math.ceil(switcherRight + 3)}px`;
  const modalStyle: CSSProperties = shouldUseFullWidth
    ? { left: modalLeft, right: 12, width: 'auto' }
    : { left: modalLeft };

  useLayoutEffect(() => {
    const switcher = document.getElementById('workspace-switcher');

    const measureSwitcher = () => {
      if (!switcher) return;
      setSwitcherRight(switcher.getBoundingClientRect().right);
    };

    measureSwitcher();

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measureSwitcher);
    if (resizeObserver && switcher) resizeObserver.observe(switcher);

    window.addEventListener('resize', measureSwitcher);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measureSwitcher);
    };
  }, []);

  const onClose = () => {
    makeTriggerWorkspaceConfigurationClickEvent({ on: false, data: null, type: null });
    onOpenChange?.(false);
  };

  const mainContent = match(kind)
    .with(WorkspaceManagerKindDict.Account, () => (
      <AccountContent
        activeSection={activeSection as TAccountActiveSection}
        onExpandedChange={setIsContentExpanded}
      />
    ))
    .with(WorkspaceManagerKindDict.VirtualLab, () => (
      <VirtualLabContent
        activeSection={activeSection as TVirtualLabActiveSection}
        creditsPanel={creditsPanel}
        onCreditsPanelChange={setCreditsPanel}
        targetVirtualLabId={activeVirtualLabId}
      />
    ))
    .with(WorkspaceManagerKindDict.Project, () => (
      <ProjectContent
        activeSection={activeSection as TProjectActiveSection}
        onClose={onClose}
        targetProjectId={targetProjectId}
        targetVirtualLabId={targetVirtualLabId}
      />
    ))
    .exhaustive();

  const footer = match({
    kind,
    activeSection,
    targetProjectId,
    targetVirtualLabId,
  } satisfies FooterInputs)
    .when(
      (
        x
      ): x is FooterInputs & {
        kind: typeof WorkspaceManagerKindDict.Project;
        targetProjectId: string;
        targetVirtualLabId: string;
      } =>
        x.kind === WorkspaceManagerKindDict.Project &&
        x.activeSection !== WorkspaceManagerSectionDict.New &&
        Boolean(x.targetProjectId && x.targetVirtualLabId),
      (x) => (
        <Button
          asChild
          variant="default"
          rounded
          size="responsive"
          className={cn(
            'bg-primary-9 mt-4 flex h-11 w-full shrink-0',
            'justify-between px-5 text-base shadow-none hover:bg-primary-9/90'
          )}
        >
          <Link
            className="text-inherit flex w-full items-center justify-between gap-2"
            href={`/app/virtual-lab/${x.targetVirtualLabId}/${x.targetProjectId}`}
            data-testid="workspace-manager-go-to-project-link"
            id="workspace-manager-go-to-project-link"
          >
            Go to project <RightOutlined />
          </Link>
        </Button>
      )
    )
    .otherwise(() => null);

  return (
    <Modal
      id="workspace-manager-modal"
      maskClosable
      open={open}
      size="lg"
      onClose={onClose}
      width={shouldUseFullWidth ? undefined : modalWidth}
      className="top-3 h-full min-h-[400px] translate-0 transform-none! overflow-hidden rounded-2xl bg-zinc-100"
      animation="fade"
      maxHeight="calc(100vh - 5.5rem + 55px)"
      bodyClassName="flex h-full max-h-[calc(100vh-1rem)] min-h-0 flex-col overflow-hidden p-0"
      overlayClassName="bg-primary-8/10 backdrop-blur-xs"
      position="custom"
      style={modalStyle}
    >
      <div
        className="flex h-full min-h-0 flex-col overflow-hidden px-4 py-4 text-primary-9"
        data-testid="workspace-manager-modal-shell"
        id="workspace-manager-modal-shell"
      >
        <WorkspaceMenuHeader
          kind={kind}
          virtualLabId={activeVirtualLabId}
          projectId={targetProjectId}
          targetVirtualLabId={targetVirtualLabId}
          activeSection={activeSection}
          onClose={onClose}
        />

        <header
          className="flex shrink-0 items-center justify-between gap-6"
          data-testid="workspace-manager-modal-header"
          id="workspace-manager-modal-header"
        >
          {kind === WorkspaceManagerKindDict.Project &&
          activeSection === WorkspaceManagerSectionDict.New ? null : (
            <PanelTabs
              activeKey={activeSection}
              items={tabs}
              onMenuItemSelect={onPanelMenuItemSelect}
              onSectionSelect={onPanelSectionSelect}
            />
          )}
          {!waveTabVisible && (
            <Button
              type="button"
              aria-label="Close workspace manager"
              variant="icon"
              size="md"
              rounded
              className={cn(
                'text-primary-9 hover:bg-white hover:shadow-sm',
                'shrink-0 border border-gray-200 text-xl shadow-none hover:text-primary-9'
              )}
              data-testid="workspace-manager-modal-close"
              id="workspace-manager-modal-close"
              onClick={onClose}
            >
              <CloseOutlined />
            </Button>
          )}
        </header>

        <ViewTransition key={routeKey} default="none" enter="fade-in" exit="fade-out">
          <main
            className="secondary-scrollbar mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto"
            data-testid="workspace-manager-modal-main"
            id="workspace-manager-modal-main"
          >
            {mainContent}
          </main>
        </ViewTransition>

        {footer}
      </div>
    </Modal>
  );
}
