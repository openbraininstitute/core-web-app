import { ReadOutlined } from '@ant-design/icons';

import BrainIcon from '@/components/icons/Brain';
import AnalysisIcon from '@/components/icons/Analysis';
import SettingsIcon from '@/components/icons/Settings';
import { MenuItem } from '@/components/TopNavigation/types';
import TopNavigation from '@/components/TopNavigation';

const tabs: MenuItem[] = [
  {
    label: 'Interactive',
    href: '/app/build/connectome-definition/interactive',
    icon: <BrainIcon className="h-4" />,
  },
  {
    label: 'Analysis',
    href: '/app/build/connectome-definition/analysis',
    icon: <AnalysisIcon className="h-4" />,
  },
  {
    label: 'Configuration',
    href: '/app/build/connectome-definition/configuration/macro',
    icon: <SettingsIcon className="h-4" />,
  },
  {
    label: 'Literature',
    href: '/app/build/connectome-definition/literature',
    icon: <ReadOutlined className="h-4 text-lg" />,
  },
];

export default function ConnectomeDefinitionTabs() {
  return <TopNavigation.SecondaryDropdown items={tabs} />;
}
