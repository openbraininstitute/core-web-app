import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { cn } from '@/utils/css-class';

export const GenerationWorkflowFormPanelDict = {
  configuration: {
    label: 'Configuration',
    value: 'configuration',
    position: 'first',
  },
  output: {
    label: 'Output',
    value: 'output',
    position: 'last',
  },
} as const;

// construct possible keys from the dict, not as an array , in this case it should be configuration | output
// construct it from the AutomatedFormPanelDict and it should not be an array but a union of the keys
export const GenerationWorkflowFormPanelKeys = Object.fromEntries(
  Object.entries(GenerationWorkflowFormPanelDict).map(([name, value]) => [name, value.value]),
) as {
  [K in keyof typeof GenerationWorkflowFormPanelDict]: (typeof GenerationWorkflowFormPanelDict)[K]['value'];
};

export type TGenerationWorkflowFormPanelKeys =
  (typeof GenerationWorkflowFormPanelKeys)[keyof typeof GenerationWorkflowFormPanelKeys];

export function GenerationWorkflowFormPanel({
  value,
  onChange,
}: {
  value: TGenerationWorkflowFormPanelKeys;
  onChange: (value: TGenerationWorkflowFormPanelKeys) => void;
}) {
  return (
    <PillTabs value={value} onValueChange={(v) => onChange(v as TGenerationWorkflowFormPanelKeys)}>
      <PillTabsList className="h-max bg-white py-0">
        {Object.entries(GenerationWorkflowFormPanelDict).map(([, opt]) => (
          <PillTabsTrigger
            key={opt.value}
            value={opt.value}
            className={cn(
              'h-10 px-10! py-3! hover:font-medium! lg:h-max!',
              'data-[state=active]:font-bold! data-[state=active]:shadow-[8px_12px_24px_0px_#0000000F,-16px_-16px_20px_0px_#FFFFFFD1]!',
              'data-[state=inactive]:text-primary-9!',
            )}
          >
            {opt.label}
          </PillTabsTrigger>
        ))}
      </PillTabsList>
    </PillTabs>
  );
}
