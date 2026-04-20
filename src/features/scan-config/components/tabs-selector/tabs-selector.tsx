import { InfoCircleFilled } from '@ant-design/icons';

import { getRoundedByIndex, Tab } from '@/features/scan-config/components/components';
import {
  LEGACY_SIMULATION_ERROR_CODE,
  SCAN_CONFIG_ERRORS,
} from '@/features/scan-config/components/utils';
import {
  BaseScanConfigTabs,
  BuildScanConfigTabs,
  ExtractScanConfigTabs,
  ProcessScanConfigTabs,
  ScanConfigActivity,
  ScanConfigTabs,
  SimulateScanConfigTabs,
  type TScanConfigActivity,
  type TScanConfigTabs,
} from '@/features/scan-config/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

interface TabsSelectorProps {
  className?: string;
  tab: TScanConfigTabs;
  setTab(tab: TScanConfigTabs): void;
  disableResultsTab: boolean;
  activity: TScanConfigActivity;
  disableConfigurationTab: boolean;
}

export default function TabsSelector({
  className,
  tab,
  setTab,
  disableResultsTab,
  activity,
  disableConfigurationTab,
}: TabsSelectorProps) {
  const tabs = Object.entries(ScanConfigTabs[activity]).map(([id, label]) => {
    const disableSimulations = !!(
      (id === SimulateScanConfigTabs.simulations ||
        id === ExtractScanConfigTabs.extractions ||
        id === ProcessScanConfigTabs.skeletonizations ||
        id === BuildScanConfigTabs.results) &&
      disableResultsTab
    );
    const disableConfiguration = disableConfigurationTab && id === BaseScanConfigTabs.configuration;
    const tooltip = disableConfiguration
      ? {
          tab: ScanConfigTabs[ScanConfigActivity.Simulate].configuration,
          code: LEGACY_SIMULATION_ERROR_CODE,
          title: SCAN_CONFIG_ERRORS[LEGACY_SIMULATION_ERROR_CODE].title,
          message: SCAN_CONFIG_ERRORS[LEGACY_SIMULATION_ERROR_CODE].message,
          disable: true,
        }
      : null;

    return {
      id,
      label,
      tooltip,
      disabled: disableSimulations || disableConfiguration,
      onClick: () => {
        if (disableResultsTab) return;
        if (activity === ScanConfigActivity.Simulate) {
          setTab({
            __activity: ScanConfigActivity.Simulate,
            id: id as keyof typeof SimulateScanConfigTabs,
          });
        } else if (activity === ScanConfigActivity.Extract) {
          setTab({
            __activity: ScanConfigActivity.Extract,
            id: id as keyof typeof ExtractScanConfigTabs,
          });
        } else if (activity === ScanConfigActivity.Process) {
          setTab({
            __activity: ScanConfigActivity.Process,
            id: id as keyof typeof ProcessScanConfigTabs,
          });
        } else if (activity === ScanConfigActivity.Build) {
          setTab({
            __activity: ScanConfigActivity.Build,
            id: id as keyof typeof BuildScanConfigTabs,
          });
        }
      },
    };
  });

  return (
    <div className={cn(className, 'flex')}>
      <div className="inline-flex overflow-hidden rounded-full border border-gray-200">
        {tabs.map(({ disabled, id, label, onClick, tooltip }, index) => {
          if (tooltip) {
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Tab
                      key={`tab-${id}`}
                      tab={label}
                      rounded={getRoundedByIndex(index, tabs.length)}
                      selectedTab={tab}
                      onClick={onClick}
                      disabled={disabled}
                      extraClass="capitalize"
                    >
                      {label}
                    </Tab>
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  avoidCollisions
                  side="bottom"
                  sideOffset={3}
                  align="start"
                  className="text-primary-8 bg-white max-w-xs shadow-2xl"
                  arrowClassName="bg-white"
                >
                  <div className="flex flex-col items-start justify-start gap-2">
                    {tooltip.title && (
                      <div className="flex items-center gap-2">
                        <InfoCircleFilled className="text-primary-8" />
                        <span className="text-primary-8 text-sm font-bold">{tooltip.title}</span>
                      </div>
                    )}
                    <div className="text-primary-9 text-sm font-light wrap-break-words text-wrap">
                      {tooltip.message}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          }
          return (
            <Tab
              key={`tab-${id}`}
              tab={label}
              rounded={getRoundedByIndex(index, tabs.length)}
              selectedTab={tab}
              onClick={onClick}
              disabled={disabled}
              extraClass="capitalize"
            >
              {label}
            </Tab>
          );
        })}
      </div>
    </div>
  );
}
