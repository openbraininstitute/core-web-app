'use client';

import { PlusOutlined } from '@ant-design/icons';
import last from 'es-toolkit/compat/last';
import { usePathname, useRouter, useSelectedLayoutSegments } from 'next/navigation';

import { useTabs } from '@/components/detail-view-tabs';
import { ROOT_ROUTE } from '@/config';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { cn } from '@/utils/css-class';

const NotebookSections = {
  Public: 'public',
  Project: 'project',
} as const;

export type NotebookSectionsKeys = (typeof NotebookSections)[keyof typeof NotebookSections];

const tabsConfigItems: Array<{
  key: NotebookSectionsKeys;
  title: string;
  position: 'first' | 'middle' | 'last';
}> = [
  {
    key: NotebookSections.Public,
    title: 'Public',
    position: 'first',
  },
  {
    key: NotebookSections.Project,
    title: 'Project',
    position: 'last',
  },
];

function NotebookTabs() {
  const navigate = useRouter().push;
  const pathname = usePathname();
  const breakpoint = useDefaultBreakpoint();
  const segments = useSelectedLayoutSegments();
  const { virtualLabId, projectId } = useWorkspace();

  const { activeTab, onChangeTab } = useTabs({
    tabsConfig: tabsConfigItems,
    clearOnDefault: false,
    defaultKey: NotebookSections.Public,
    shallow: true,
    tabKey: 'scope',
  });

  const onTabClick = (value: string) => {
    if (pathname === `${ROOT_ROUTE}/${virtualLabId}/${projectId}/explore`) {
      onChangeTab(value)();
    } else navigate(`${ROOT_ROUTE}/${virtualLabId}/${projectId}/explore?scope=${value}`);
  };

  const currentScope =
    segments.at(1) === 'entity' || !last(segments)
      ? (activeTab ?? NotebookSections.Public)
      : undefined;
  return (
    <PillTabs
      value={currentScope}
      className="w-full"
      activationMode="manual"
      onValueChange={onTabClick}
    >
      <PillTabsList
        className={cn('grid h-10 w-full grid-cols-2 bg-white p-0 shadow-2xl', {
          'h-12': breakpoint === 'xl',
        })}
      >
        {tabsConfigItems.map((tab) => (
          <PillTabsTrigger
            key={tab.key}
            value={tab.key}
            position={tab.position}
            className={cn(
              'data-[state=active]:bg-primary-9 hover:bg-neutral-1 hover:text-primary-8 h-10 px-14! py-3 text-base select-none data-[state=active]:font-bold data-[state=active]:text-white',
              { 'h-12': breakpoint === 'xl' }
            )}
          >
            {tab.title}
          </PillTabsTrigger>
        ))}
      </PillTabsList>
    </PillTabs>
  );
}

export function NotebookHeader() {
  const breakpoint = useDefaultBreakpoint();

  return (
    <div className="flex w-full items-center justify-between gap-4 px-3 [grid-area:header]">
      <div
        className="flex max-w-1/2 items-center justify-center gap-2"
        id="notebook-scope-selector"
        data-testid="notebook-scope-selector"
      >
        <NotebookTabs />
      </div>
      <div
        className="max-w-1/2"
        id="view-in-jupyter-selector"
        data-testid="view-in-jupyter-selector"
      >
        <Button
          rounded
          variant="success"
          size={breakpoint === 'xl' ? 'lg' : 'md'}
          type="button"
          className="px-8"
        >
          <div className="flex items-center justify-between gap-5">
            <span>Open JupyterLab</span>
            <PlusOutlined className="ml-auto text-sm" />
          </div>
        </Button>
      </div>
    </div>
  );
}
