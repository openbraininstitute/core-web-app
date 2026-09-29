'use client';

import { useAtom, useAtomValue } from 'jotai';
import { useEffect, useMemo } from 'react';

import { isPlainObject } from '@/features/scan-config/components/utils';
import { agentStateAtom, useAgentState } from '@/services/ai-agent/hooks/chat';
import {
  CONFIGURATION_FORM_STATE_KEY,
  GenerativeFromAtomFamily,
} from '@/ui/segments/workflows/build/ion-channel-build/helpers';

const AI_CONFIG_KEY = 'ion_channel_fitting_config';

/**
 * Two-way bridge between this page's RJSF form data and the AI chat shared state.
 *
 * This page predates the generic scan-config editor, so it does not go through
 * `useScanConfigTemplate` and therefore gets none of its AI wiring. The backend has
 * supported `ion_channel_fitting_config` since prod-ai#103; without this hook nothing
 * populates it, so the agent sees an empty state on the Build > Ion Channel page.
 *
 * The form data is the obi-one `IonChannelFittingScanConfig` JSON verbatim — `sections/output`
 * posts the same object straight to the builder — so no translation is needed in either
 * direction.
 */
export function useIonChannelAgentSync(sessionId: string) {
  const formAtom = useMemo(
    () => GenerativeFromAtomFamily(`${CONFIGURATION_FORM_STATE_KEY}/${sessionId}`),
    [sessionId]
  );
  const [formData, setFormData] = useAtom(formAtom);
  const agentState = useAtomValue(agentStateAtom);

  // Publish. Only once the persisted form data has hydrated into an object: `useAgentState`
  // substitutes a CircuitSimulationScanConfig default when `config` is undefined, which under
  // this key would hand the agent a config for an entirely different workflow.
  useAgentState(isPlainObject(formData) ? AI_CONFIG_KEY : '', formData);

  // Consume the agent's edits. Merge per top-level block rather than replacing wholesale, so
  // a patch touching only `gate_exponents` cannot drop the selected recording.
  const incoming = agentState[AI_CONFIG_KEY];
  useEffect(() => {
    if (!isPlainObject(incoming)) return;

    setFormData((current) => {
      const base = isPlainObject(current) ? current : {};
      const merged = { ...base, ...incoming };
      // Skip the write when nothing actually changed, otherwise publish -> consume ->
      // publish loops on every render.
      return JSON.stringify(merged) === JSON.stringify(base) ? current : merged;
    });
  }, [incoming, setFormData]);
}
