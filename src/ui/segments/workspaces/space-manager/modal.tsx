'use client';

import { CloseOutlined, RightOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useEffect, useLayoutEffect, useState, ViewTransition } from 'react';
import { match } from 'ts-pattern';

import { Button } from '@/ui/molecules/button';
import { Modal } from '@/ui/molecules/modal';
import {
  type TWorkspaceManagerKind,
  WorkspaceManagerKindDict,
  WorkspaceManagerSectionDict,
} from '@/ui/segments/workspaces/space-manager/constants';
import { makeTriggerWorkspaceConfigurationClickEvent } from '@/ui/segments/workspaces/space-manager/event';
import {
  AccountContent,
  type TActiveSection as TAccountActiveSection,
} from '@/ui/segments/workspaces/space-manager/sections/account';
import { PanelTabs, type TabItem } from '@/ui/segments/workspaces/space-manager/sections/elements';
import {
  getProjectUrl,
  ProjectContent,
  type TActiveSection as TProjectActiveSection,
} from '@/ui/segments/workspaces/space-manager/sections/project';
import {
  type TActiveSection as TVirtualLabActiveSection,
  VirtualLabContent,
} from '@/ui/segments/workspaces/space-manager/sections/virtual-lab';
import { cn } from '@/utils/css-class';

import type { CSSProperties } from 'react';

const AccountTabsDict: Array<TabItem> = [
  { key: WorkspaceManagerSectionDict.Profile, label: 'Profile' },
  { key: WorkspaceManagerSectionDict.Subscription, label: 'Subscription' },
  { key: WorkspaceManagerSectionDict.Invoices, label: 'Invoices' },
];

const VirtualLabTabsDict: Array<TabItem> = [
  { key: WorkspaceManagerSectionDict.Overview, label: 'Overview' },
  { key: WorkspaceManagerSectionDict.Members, label: 'Administrators' },
  { key: WorkspaceManagerSectionDict.Credits, label: 'Credits' },
];

const ProjectTabsDict: Array<TabItem> = [
  { key: WorkspaceManagerSectionDict.Overview, label: 'Overview' },
  { key: WorkspaceManagerSectionDict.Members, label: 'Members' },
  { key: WorkspaceManagerSectionDict.History, label: 'Activities' },
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
  ]),
  [WorkspaceManagerKindDict.VirtualLab]: new Set([
    WorkspaceManagerSectionDict.Overview,
    WorkspaceManagerSectionDict.Members,
    WorkspaceManagerSectionDict.Credits,
  ]),
  [WorkspaceManagerKindDict.Project]: new Set([
    WorkspaceManagerSectionDict.Overview,
    WorkspaceManagerSectionDict.Members,
    WorkspaceManagerSectionDict.History,
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
        activeSection: WorkspaceManagerSectionDict.History,
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
          className={cn(
            'bg-primary-9 mt-4 flex h-11 w-full shrink-0',
            'justify-between px-5 text-base shadow-none hover:bg-primary-9/90'
          )}
        >
          <Link
            className="text-inherit flex w-full items-center justify-between gap-2"
            href={getProjectUrl({
              virtualLabId: x.targetVirtualLabId,
              projectId: x.targetProjectId,
            })}
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
      maxHeight="calc(100vh - 5.5rem + 58px)"
      bodyClassName="flex h-full max-h-[calc(100vh-1rem)] min-h-0 flex-col overflow-hidden p-0"
      position="custom"
      style={modalStyle}
    >
      <div
        className="flex h-full min-h-0 flex-col overflow-hidden px-4 py-4 text-primary-9"
        data-testid="workspace-manager-modal-shell"
        id="workspace-manager-modal-shell"
      >
        <header
          className="flex shrink-0 items-center justify-between gap-6"
          data-testid="workspace-manager-modal-header"
          id="workspace-manager-modal-header"
        >
          <PanelTabs
            activeKey={activeSection}
            items={tabs}
            onSelect={(nextSection) => {
              setIsContentExpanded(false);
              setLocalSection(nextSection);
            }}
          />
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
        </header>

        <ViewTransition key={routeKey} default="none" enter="fade-in" exit="fade-out">
          <main
            className="secondary-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto"
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
