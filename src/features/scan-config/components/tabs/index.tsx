import { InfoCircleFilled } from '@ant-design/icons';
import { useAtomValue } from 'jotai';

import { ConfigurationIcon, ResultsIcon } from '@/components/icons';
import { resultsSidePanelOpenAtom } from '@/features/scan-config/components/shared/results-layout';
import { useScanConfigTopBarSlots } from '@/features/scan-config/components/top-bar/context';
import {
  LEGACY_SIMULATION_ERROR_CODE,
  SCAN_CONFIG_ERRORS,
} from '@/features/scan-config/components/utils';
import {
  BaseScanConfigTabs,
  BuildScanConfigTabs,
  ExtractScanConfigTabs,
  OptimizeScanConfigTabs,
  ProcessScanConfigTabs,
  ScanConfigActivity,
  ScanConfigTabs,
  SimulateScanConfigTabs,
  type TScanConfigActivity,
  type TScanConfigTabs,
  ValidateScanConfigTabs,
} from '@/features/scan-config/types';
import { MorphingTabs, type MorphingTabsItem } from '@/ui/molecules/morphing-tabs';

import type { ReactNode } from 'react';

type ScanConfigTabsPanelProps = {
  className?: string;
  tab: TScanConfigTabs;
  setTab(tab: TScanConfigTabs): void;
  activity: TScanConfigActivity;
  disableResultsTab: boolean;
  disableConfigurationTab: boolean;
  configuration: ReactNode;
  results: ReactNode;
  /** Rail-level content centred on the panel edge (e.g. the selection's copy action). */
  railCenter?: ReactNode;
};

/** The results tab is named after the activity — `simulations`, `extractions`, … */
function isResultsTab(id: string) {
  return (
    id === SimulateScanConfigTabs.simulations ||
    id === ExtractScanConfigTabs.extractions ||
    id === ProcessScanConfigTabs.skeletonizations ||
    id === BuildScanConfigTabs.results ||
    id === OptimizeScanConfigTabs.optimizations ||
    id === ValidateScanConfigTabs.validations
  );
}

export function toScanConfigTab(activity: TScanConfigActivity, id: string): TScanConfigTabs {
  switch (activity) {
    case ScanConfigActivity.Extract:
      return {
        __activity: ScanConfigActivity.Extract,
        id: id as keyof typeof ExtractScanConfigTabs,
      };
    case ScanConfigActivity.Process:
      return {
        __activity: ScanConfigActivity.Process,
        id: id as keyof typeof ProcessScanConfigTabs,
      };
    case ScanConfigActivity.Build:
      return { __activity: ScanConfigActivity.Build, id: id as keyof typeof BuildScanConfigTabs };
    case ScanConfigActivity.Optimize:
      return {
        __activity: ScanConfigActivity.Optimize,
        id: id as keyof typeof OptimizeScanConfigTabs,
      };
    case ScanConfigActivity.Validate:
      return {
        __activity: ScanConfigActivity.Validate,
        id: id as keyof typeof ValidateScanConfigTabs,
      };
    default:
      return {
        __activity: ScanConfigActivity.Simulate,
        id: id as keyof typeof SimulateScanConfigTabs,
      };
  }
}

function LegacyConfigurationTooltip() {
  const { title, message } = SCAN_CONFIG_ERRORS[LEGACY_SIMULATION_ERROR_CODE];

  return (
    <div className="flex max-w-xs flex-col items-start justify-start gap-2">
      {title && (
        <div className="flex items-center gap-2">
          <InfoCircleFilled />
          <span className="text-sm font-bold">{title}</span>
        </div>
      )}
      <div className="text-sm font-light wrap-break-words text-wrap">{message}</div>
    </div>
  );
}

export function ScanConfigTabsPanel({
  className,
  tab,
  setTab,
  activity,
  disableResultsTab,
  disableConfigurationTab,
  configuration,
  results,
  railCenter,
}: ScanConfigTabsPanelProps) {
  // the host's breadcrumb leads the rail, so the skeleton and the ready template share it
  const { start, end } = useScanConfigTopBarSlots();
  // a results view's side panel takes the whole surface, rail and all
  const railCollapsed = useAtomValue(resultsSidePanelOpenAtom);
  // not memoised: `configuration` and `results` are fresh nodes on every render
  const items: MorphingTabsItem[] = Object.entries(ScanConfigTabs[activity]).map(([id, label]) => {
    const isConfiguration = id === BaseScanConfigTabs.configuration;
    const disableConfiguration = disableConfigurationTab && isConfiguration;
    const disabled = (isResultsTab(id) && disableResultsTab) || disableConfiguration;
    const Icon = isConfiguration ? ConfigurationIcon : ResultsIcon;

    return {
      id,
      label,
      testId: `scan-config-tab-${id}`,
      icon: <Icon className="size-5" />,
      disabled,
      tooltip: disableConfiguration ? <LegacyConfigurationTooltip /> : undefined,
      content: isConfiguration ? configuration : results,
    };
  });

  return (
    <MorphingTabs
      tabsAlign="end"
      railStart={start}
      railCenter={railCenter}
      railEnd={end}
      railCollapsed={railCollapsed}
      // The panel's boxes sit on the page; the tabs are pills over them.
      surfaceless
      items={items}
      value={tab.id}
      onValueChange={(id) => id && setTab(toScanConfigTab(activity, id))}
      ariaLabel={`${activity} workflow`}
      className={className}
      classNames={{ label: 'capitalize' }}
    />
  );
}

export default ScanConfigTabsPanel;
