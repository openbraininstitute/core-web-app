import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { loadable } from 'jotai/utils';
import { ReadOutlined } from '@ant-design/icons';

import BrainIcon from '@/components/icons/Brain';
import AnalysisIcon from '@/components/icons/Analysis';
import SettingsIcon from '@/components/icons/Settings';
import { cellCompositionAtom } from '@/state/brain-model-config/cell-composition';
import TopNavigation from '@/components/TopNavigation';
import { MenuItem } from '@/components/TopNavigation/types';

const DEFAULT_TABS: MenuItem[] = [
  {
    label: 'Interactive',
    href: '/app/build/cell-composition/interactive',
    icon: <BrainIcon className="h-4" />,
  },
  {
    label: 'Analysis',
    href: '/app/build/cell-composition/analysis',
    icon: <AnalysisIcon className="h-4" />,
  },
  {
    label: 'Configuration',
    href: '/app/build/cell-composition/configuration',
    icon: <SettingsIcon className="h-4" />,
  },
  {
    label: 'Literature',
    href: '/app/build/cell-composition/literature',
    icon: <ReadOutlined className="h-4 text-lg" />,
  },
];

const DISABLE_ON_CHANGE_TABS = ['Analysis'];

export default function CellCompositionTabs() {
  const compositionLoadable = useAtomValue(loadable(cellCompositionAtom));
  const compositionHasChanged =
    compositionLoadable.state === 'hasData' && !compositionLoadable.data;

  const tabs = useMemo(
    () =>
      DEFAULT_TABS.filter(
        (tab) => !compositionHasChanged || !DISABLE_ON_CHANGE_TABS.includes(tab.label)
      ),
    [compositionHasChanged]
  );

  return <TopNavigation.SecondaryDropdown items={tabs} />;
}
