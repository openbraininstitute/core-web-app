'use client';

import { atom, useAtomValue, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useCallback } from 'react';

/**
 * Right-column settings panel.
 *
 * A field asks for the panel by identity (`open`), and the right column answers by rendering the
 * mount points. The field then portals its own form into them, so the panel always reads the live
 * config and schema the field already holds — storing a rendered node here instead would freeze
 * it at the moment it was opened.
 */
export type TScanConfigSettingsPanel = {
  /** stable identity of what is being edited, e.g. `IDRestProtocol` or `IDRestProtocol:ahp_depth` */
  key: string;
  title: string;
};

type TSettingsPanelState = {
  /** null when no panel is open */
  open: TScanConfigSettingsPanel | null;
  /** mount point for the panel body, published by the right column while a panel is open */
  slot: HTMLElement | null;
  /**
   * Mount point in the panel's own header, beside the title.
   *
   * Separate from the body so a panel can own a control that belongs to its heading — a search
   * field for a long list, say — without the panel host having to know what that control is.
   */
  headerSlot: HTMLElement | null;
};

const EMPTY: TSettingsPanelState = { open: null, slot: null, headerSlot: null };

/**
 * One atom for the whole panel; the hooks below are selectors over it.
 *
 * The selectors matter: a protocol's feature list renders one `useIsSettingsPanelOpen` per row, so
 * subscribing those rows to the whole object would re-render every one of them whenever any part
 * of the panel changed — including the two mount points, which change on every open and close.
 */
const settingsPanelAtom = atom<TSettingsPanelState>(EMPTY);

const openAtom = selectAtom(settingsPanelAtom, (state) => state.open);
const openKeyAtom = selectAtom(settingsPanelAtom, (state) => state.open?.key ?? null);
const slotAtom = selectAtom(settingsPanelAtom, (state) => state.slot);
const headerSlotAtom = selectAtom(settingsPanelAtom, (state) => state.headerSlot);

/** Which panel is open, if any. */
export function useScanConfigSettingsPanel() {
  return useAtomValue(openAtom);
}

/** True when the panel currently open is the one identified by `key`. */
export function useIsSettingsPanelOpen(key: string): boolean {
  return useAtomValue(openKeyAtom) === key;
}

export function useScanConfigSettingsPanelSlot() {
  return useAtomValue(slotAtom);
}

export function useScanConfigSettingsPanelHeaderSlot() {
  return useAtomValue(headerSlotAtom);
}

/**
 * Patch the panel state: pass the fields to change, or a function of the current state.
 *
 * One setter for all three fields, so opening a panel and publishing its mount points cannot end
 * up as two separate updates that render an intermediate state.
 */
export function useSetScanConfigSettingsPanel() {
  const set = useSetAtom(settingsPanelAtom);

  return useCallback(
    (
      patch:
        | Partial<TSettingsPanelState>
        | ((current: TSettingsPanelState) => Partial<TSettingsPanelState>)
    ) => {
      set((current) => ({
        ...current,
        ...(typeof patch === 'function' ? patch(current) : patch),
      }));
    },
    [set]
  );
}
