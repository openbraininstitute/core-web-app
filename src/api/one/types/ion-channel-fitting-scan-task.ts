/**
 * The shape of a campaign's `campaign_generation_config` asset, narrowed to the part that is
 * read back: which recordings the campaign was fitted from.
 *
 * `recordings` is a scan dimension, so a campaign over several holds an array here and one
 * over a single recording holds the ref on its own.
 */
export interface IonChannelRecordingFromID {
  id_str: string;
  type: 'IonChannelRecordingFromID';
}

export interface IonChannelFittingGridScanGenerationTask {
  type: 'GridScanGenerationTask';
  form: {
    type: 'IonChannelFittingScanConfig';
    initialize: {
      type: 'IonChannelFittingScanConfig.Initialize';
      recordings: IonChannelRecordingFromID | IonChannelRecordingFromID[];
      ion_channel_name: string;
    };
  };
}
