export interface IonChannelFittingGridScanGenerationTask {
  obi_one_version: string;
  type: 'GridScanGenerationTask';
  output_root: string;
  form: IonChannelFittingScanConfigWrapper;
  coordinate_directory_option: string;
}

export interface IonChannelFittingScanConfigWrapper {
  type: 'IonChannelFittingScanConfig';
  initialize: InitializeConfig;
  info: Info;
  minf_eq: SigFitMInf;
  mtau_eq: ThermoFitMTau;
  hinf_eq: SigFitHInf;
  htau_eq: SigFitHTau;
  gate_exponents: GateExponents;
}

export interface InitializeConfig {
  type: 'IonChannelFittingScanConfig.Initialize';
  recordings: IonChannelRecordingFromID;
  ion_channel_name: string;
}

export interface IonChannelRecordingFromID {
  id_str: string;
  type: 'IonChannelRecordingFromID';
}

export interface Info {
  type: 'Info';
  campaign_name: string;
  campaign_description: string;
}

export interface SigFitMInf {
  type: 'SigFitMInf';
}

export interface ThermoFitMTau {
  type: 'ThermoFitMTau';
}

export interface SigFitHInf {
  type: 'SigFitHInf';
}

export interface SigFitHTau {
  type: 'SigFitHTau';
}

export interface GateExponents {
  type: 'IonChannelFittingScanConfig.GateExponents';
  m_power: number;
  h_power: number;
}
