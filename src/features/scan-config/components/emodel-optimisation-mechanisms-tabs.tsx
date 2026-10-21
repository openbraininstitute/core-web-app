import { CheckCircleFilled, WarningFilled } from '@ant-design/icons';
import { match } from 'ts-pattern';

import { LeftMenuTab } from '@/features/scan-config/components/components';
import {
  errorsUnder,
  hasErrorAt,
  nonParameterErrors,
  parameterErrors,
  totalAssignedModelCount,
} from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';
import {
  EMODEL_OPTIMISATION_MECHANISMS_TABS,
  EModelOptimisationMechanismsTabs,
} from '@/features/scan-config/types';

import type { ErrorObject } from 'ajv';
import type { ConfigValue } from '@/features/scan-config/types';

/**
 * Whether the config a tab writes has schema errors. Each tab owns the keys it writes (paths are
 * relative to the emodel value):
 * - Mechanism Selection: `mechanisms.ion_channel_models`
 * - Region Assignment: the `mechanisms.mechanism_regions.<region>` entries, minus their `parameters`
 * - Parameters Selection: `mechanisms.mechanism_regions.<region>[i].parameters`
 * - Global Parameters: `global_parameters`
 *
 * Mechanism Selection also warns while the emodel value is missing (no tab has written it yet), as
 * the configuration starts there.
 */
function tabHasErrors(tab: string, emodelErrors: readonly ErrorObject[]): boolean {
  return match(tab)
    .with(EModelOptimisationMechanismsTabs.MechanismSelection, () =>
      hasErrorAt(emodelErrors, '/mechanisms/ion_channel_models')
    )
    .with(EModelOptimisationMechanismsTabs.RegionAssignment, () =>
      hasErrorAt(nonParameterErrors(emodelErrors), '/mechanisms/mechanism_regions')
    )
    .with(
      EModelOptimisationMechanismsTabs.ParametersSelection,
      () => parameterErrors(emodelErrors).length > 0
    )
    .with(EModelOptimisationMechanismsTabs.GlobalParameters, () =>
      hasErrorAt(emodelErrors, '/global_parameters')
    )
    .otherwise(() => false);
}

/**
 * Nested left-nav tabs for the `emodel_optimisation_parameters` root element.
 *
 * The layout is fully hardcoded (a fixed set of mechanisms tabs), not derived from schema. Each tab
 * shows a warning when the config it writes fails schema validation, and a check otherwise.
 */
export function EModelOptimisationMechanismsTabList({
  rootElement,
  selectedRootElement,
  selectedMechanismsTab,
  onSelectTab,
  value,
  errors,
}: {
  rootElement: string;
  selectedRootElement: string;
  selectedMechanismsTab: string;
  onSelectTab: (tab: string) => void;
  /** value of the `emodel_optimisation_parameters` config key */
  value: ConfigValue;
  /** ajv schema errors of the whole config */
  errors: ErrorObject[] | null | undefined;
}) {
  const emodelErrors = errorsUnder(errors, `/${rootElement}`);
  const assignedCount = totalAssignedModelCount(value);

  return (
    <div className="ml-3 flex flex-col gap-0.5 border-l border-gray-200 pl-2">
      {EMODEL_OPTIMISATION_MECHANISMS_TABS.map(({ key, label }) => (
        <LeftMenuTab
          key={key}
          tab={key}
          testId={`scan-config-emodel-mechanisms-tab-${key}`}
          // only highlight the inner tab while this root element is the selected one
          selectedTab={selectedRootElement === rootElement ? selectedMechanismsTab : ''}
          onClick={() => onSelectTab(key)}
          extraClass="w-full flex text-left justify-between gap-2 min-h-[40px] items-center px-2 ml-2"
          style={undefined}
        >
          <span className="wrap-break-word min-w-0 text-sm">{label}</span>
          <div className="flex shrink-0 items-center gap-3">
            {key === EModelOptimisationMechanismsTabs.ParametersSelection && (
              <span
                className="inline-flex size-5 min-w-5 shrink-0 items-center justify-center rounded-full border border-current px-1 text-[11px] leading-none font-semibold tabular-nums"
                data-testid="scan-config-emodel-parameters-selection-icm-count"
              >
                {assignedCount}
              </span>
            )}
            {tabHasErrors(key, emodelErrors) ? (
              <WarningFilled className="text-yellow-400!" />
            ) : (
              <CheckCircleFilled className="text-green-600!" />
            )}
          </div>
        </LeftMenuTab>
      ))}
    </div>
  );
}
