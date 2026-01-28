import { getRoundedByIndex, Tab } from '@/features/scan-config/components/components';
// biome-ignore lint/style/useImportType: biome hallucination
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

  return (
    <div className={classNames(className, 'flex')}>
      <div className="inline-flex overflow-hidden rounded-full border border-gray-200">
        {tabs.map(({ disabled, id, label, onClick }, index) => (
          <Tab
            key={`${id}`}
            tab={label}
            rounded={getRoundedByIndex(index, tabs.length)}
            selectedTab={tab}
            onClick={onClick}
            disabled={disabled}
            extraClass="capitalize"
          >
            {label}
          </Tab>
        ))}
      </div>
    </div>
  );
}
