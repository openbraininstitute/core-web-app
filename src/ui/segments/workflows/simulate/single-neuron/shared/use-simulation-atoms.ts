import { useAtom } from 'jotai';

import { getSessionKey } from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';
import {
  AmperageStateAtomFamily,
  ExperimentalSetupConfigurationAtomFamily,
  FrequencyInputConfigurationAtomFamily,
  genericSingleNeuronSimulationPlotDataAtomFamily,
  OverviewConfigurationAtomFamily,
  RecordLocationConfigurationAtomFamily,
  simulationStatusAtomFamily,
  StimulationConfigurationAtomFamily,
  SynaptomeConfigurationAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import {
  PREFIX_STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY,
  PREFIX_RECORDING_LOCATION_CONFIGURATION_SESSION_KEY,
  PREFIX_EXPERIMENTAL_SETUP_CONFIGURATION_SESSION_KEY,
  PREFIX_SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY,
  PREFIX_FREQUENCY_INPUT_CONFIGURATION_SESSION_KEY,
  PREFIX_OVERVIEW_CONFIGURATION_SESSION_KEY,
  PREFIX_AMPERAGE_CONFIGURATION_SESSION_KEY,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';

export function useSingleNeuronSimulationAtoms(sessionId: string) {
  const spcKey = getSessionKey(PREFIX_STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY, sessionId);
  const sesKey = getSessionKey(PREFIX_EXPERIMENTAL_SETUP_CONFIGURATION_SESSION_KEY, sessionId);
  const rlcKey = getSessionKey(PREFIX_RECORDING_LOCATION_CONFIGURATION_SESSION_KEY, sessionId);
  const sscKey = getSessionKey(PREFIX_SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY, sessionId);
  const freqKey = getSessionKey(PREFIX_FREQUENCY_INPUT_CONFIGURATION_SESSION_KEY, sessionId);
  const infoKey = getSessionKey(PREFIX_OVERVIEW_CONFIGURATION_SESSION_KEY, sessionId);
  const ampKey = getSessionKey(PREFIX_AMPERAGE_CONFIGURATION_SESSION_KEY, sessionId);

  const [overviewConfiguration] = useAtom(OverviewConfigurationAtomFamily(infoKey));
  const [stimulationConfiguration] = useAtom(StimulationConfigurationAtomFamily(spcKey));
  const [experimentalSetupConfiguration] = useAtom(
    ExperimentalSetupConfigurationAtomFamily(sesKey)
  );
  const [recordLocationConfiguration] = useAtom(RecordLocationConfigurationAtomFamily(rlcKey));
  const [synaptomeConfiguration] = useAtom(SynaptomeConfigurationAtomFamily(sscKey));
  const [frequencyConfiguration] = useAtom(FrequencyInputConfigurationAtomFamily(freqKey));
  const [amperageConfiguration] = useAtom(AmperageStateAtomFamily(ampKey));

  const [simulationResults] = useAtom(genericSingleNeuronSimulationPlotDataAtomFamily(sessionId));
  const [simulationStatus] = useAtom(simulationStatusAtomFamily(sessionId));

  return {
    overviewConfiguration,
    stimulationConfiguration,
    experimentalSetupConfiguration,
    recordLocationConfiguration,
    synaptomeConfiguration,
    frequencyConfiguration,
    amperageConfiguration,
    simulationStatus,
    simulationResults,
  };
}
