import { LeftMenuTab } from '@/features/scan-config/components/components';
import { EMODEL_OPTIMISATION_MECHANISMS_TABS } from '@/features/scan-config/types';

/**
 * Nested left-nav tabs for the `emodel_optimisation_parameters` root element.
 *
 * The layout is fully hardcoded (a fixed set of mechanisms tabs), not derived from schema
 */
export function EModelOptimisationMechanismsTabList({
  rootElement,
  selectedRootElement,
  selectedMechanismsTab,
  onSelectTab,
}: {
  rootElement: string;
  selectedRootElement: string;
  selectedMechanismsTab: string;
  onSelectTab: (tab: string) => void;
}) {
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
          extraClass="w-full flex text-left justify-start min-h-[40px] items-center px-2 ml-2"
          style={undefined}
        >
          <span className="wrap-break-word min-w-0 text-sm">{label}</span>
        </LeftMenuTab>
      ))}
    </div>
  );
}
