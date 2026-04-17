import { InfoCircleFilled } from '@ant-design/icons';

import { getRoundedByIndex, Tab } from '@/features/scan-config/components/components';
// biome-ignore lint/style/useImportType: biome hallucination
import {
  Config,
  ConfigSchema,
  ExtractScanConfigTabs,
  ScanConfigActivity,
  ScanConfigTabs,
  SimulateScanConfigTabs,
  type TScanConfigActivity,
  type TScanConfigTabs,
} from '@/features/scan-config/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import { useInitialConfigErrors } from '../hooks';

interface TabsSelectorProps {
  className?: string;
  tab: TScanConfigTabs;
  setTab(tab: TScanConfigTabs): void;
  disableResultsTab: boolean;
  activity: TScanConfigActivity;
  initialConfig: Config | undefined;
  schema: ConfigSchema | null;
}

export default function TabsSelector({
  className,
  tab,
  setTab,
  disableResultsTab,
  activity,
  initialConfig,
  schema,
}: TabsSelectorProps) {
  const errors = useInitialConfigErrors({ initialConfig, schema });

  const tabs = Object.entries(ScanConfigTabs[activity]).map(([id, label]) => {
    const disabled = !!(
      ((id === 'simulations' || id === 'extractions' || id === 'skeletonizations') &&
        disableResultsTab) ||
      errors?.find((er) => er.tab === id)?.disable
    );
    const tooltip = errors?.find((er) => er.tab === id);
    return {
      id,
      label,
      disabled,
      tooltip,
      onClick: () => {
        if (disableResultsTab && id === 'simulations') return;
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
