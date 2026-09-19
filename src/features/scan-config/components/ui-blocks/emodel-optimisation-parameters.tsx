'use client';

/**
 * Bespoke Middle-panel renderer for the `emodel_optimisation_parameters` root element.
 *
 * Fully custom (not schema-driven): the Left panel hardcodes a single "Mechanisms" outer tab with
 * three inner tabs; this renders the currently selected inner tab.
 *
 * SCAFFOLD: for now it only reports which inner tab is selected.
 */

import { EMODEL_OPTIMISATION_MECHANISMS_TABS } from '@/features/scan-config/types';

type Props = {
  /** selected inner-tab key (one of `EModelOptimisationMechanismsTabs`) */
  selectedTab: string;
};

export function EModelOptimisationParameters({ selectedTab }: Props) {
  const tab = EMODEL_OPTIMISATION_MECHANISMS_TABS.find((t) => t.key === selectedTab);

  return (
    <div className="flex h-full w-full flex-col gap-2 p-4">
      {tab ? (
        <>
          <h3 className="text-primary-8 text-lg font-bold">{tab.label}</h3>
          <p className="text-sm text-gray-500">Selected: {tab.key}</p>
        </>
      ) : (
        <p className="text-sm text-gray-400 italic">Select a tab from the left.</p>
      )}
    </div>
  );
}
