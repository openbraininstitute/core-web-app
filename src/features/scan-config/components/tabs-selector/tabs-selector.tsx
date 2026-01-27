import { Tab } from '@/features/scan-config/components/components';
// biome-ignore lint/style/useImportType: this is wrong
import {
  ExtractScanConfigTabs,
  ScanConfigActivity,
  ScanConfigTabs,
  SimulateScanConfigTabs,
  type TScanConfigActivity,
  type TScanConfigTabs,
} from '@/features/scan-config/types';
import { classNames } from '@/util/utils';

interface TabsSelectorProps {
  className?: string;
  tab: TScanConfigTabs;
  setTab(tab: TScanConfigTabs): void;
  disableSimulationTab: boolean;
  activity: TScanConfigActivity;
}

export default function TabsSelector({
  className,
  tab,
  setTab,
  disableSimulationTab,
  activity,
}: TabsSelectorProps) {
  const tabs = Object.entries(ScanConfigTabs[activity]).map(([id, label]) => ({
    id,
    label,
    disabled: id === 'simulations' && disableSimulationTab,
    onClick: () => {
      if (disableSimulationTab && id === 'simulations') return;
      if (activity === ScanConfigActivity.Simulate) {
        setTab({
          __activity: ScanConfigActivity.Simulate,
          id: id as keyof typeof SimulateScanConfigTabs,
        });
      } else {
        setTab({
          __activity: ScanConfigActivity.Extract,
          id: id as keyof typeof ExtractScanConfigTabs,
        });
      }
    },
  }));
  console.log('# # TabsSelector # tabs:', { tabs, tab, activity, disableSimulationTab });

  return (
    <div className={classNames(className, 'flex')}>
      <div className="inline-flex overflow-hidden rounded-full border border-gray-200">
        {tabs.map(({ disabled, id, label, onClick }) => (
          <Tab
            key={`${id}`}
            tab={label}
            rounded="rounded-l-full"
            selectedTab={tab}
            onClick={onClick}
            disabled={disabled}
            extraClass="capitalize"
          >
            {label}
          </Tab>
        ))}
        {/* <Tab
          tab="configuration"
          rounded="rounded-l-full"
          selectedTab={tab}
          onClick={() => setTab('configuration')}
        >
          Configuration
        </Tab>
        <Tab
          tab="simulations"
          rounded="rounded-r-full"
          selectedTab={tab}
          onClick={() => setTab('simulations')}
          disabled={disableSimulationTab}
        >
          Simulations
        </Tab> */}
      </div>
    </div>
  );
}
