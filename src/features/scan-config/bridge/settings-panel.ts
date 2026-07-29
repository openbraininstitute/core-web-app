'use client';

import { atom, useAtomValue, useSetAtom } from 'jotai';

/**
 * Right-column settings panel.
 *
 * A field asks for the panel by identity (`open`), and the right column answers by rendering a
 * mount point. The field then portals its own form into it, so the panel always reads the live
 * config and schema the field already holds — storing a rendered node here instead would freeze
 * it at the moment it was opened.
 */
export type TScanConfigSettingsPanel = {
  /** stable identity of what is being edited, e.g. `IDRestProtocol` or `IDRestProtocol:ahp_depth` */
  key: string;
  title: string;
};

const settingsPanelAtom = atom<TScanConfigSettingsPanel | null>(null);

/** Mount point published by the right column while a panel is open. */
const settingsPanelSlotAtom = atom<HTMLElement | null>(null);

export function useScanConfigSettingsPanel() {
  return useAtomValue(settingsPanelAtom);
}

export function useSetScanConfigSettingsPanel() {
  return useSetAtom(settingsPanelAtom);
}

export function useScanConfigSettingsPanelSlot() {
  return useAtomValue(settingsPanelSlotAtom);
}

export function useSetScanConfigSettingsPanelSlot() {
  return useSetAtom(settingsPanelSlotAtom);
}

/** True when the panel currently open is the one identified by `key`. */
export function useIsSettingsPanelOpen(key: string): boolean {
  return useScanConfigSettingsPanel()?.key === key;
}
