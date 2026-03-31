interface SecMarkerConfigCommon {
  secName: string
}

interface RecordingSecMarkerConfig extends SecMarkerConfigCommon {
  type: 'recording'
  segIdx: number
}

interface StimulusSecMarkerConfig extends SecMarkerConfigCommon {
  type: 'stimulus'
}

export type SecMarkerConfig = RecordingSecMarkerConfig | StimulusSecMarkerConfig

export type NeuronSectionInfo = {
  index: number
  name: string
  nseg: number
  distance_from_soma: number
  sec_length: number
  xstart: number[]
  xend: number[]
  xcenter: number[]
  xdirection: number[]
  ystart: number[]
  yend: number[]
  ycenter: number[]
  ydirection: number[]
  zstart: number[]
  zend: number[]
  zcenter: number[]
  zdirection: number[]
  segx: number[]
  diam: number[]
  length: number[]
  distance: number[]
  neuron_segments_offset: number[]
  neuron_section_id: number
  segment_distance_from_soma: number[]
}

export type Morphology = {
  [secName: string]: NeuronSectionInfo
}

export type PlotDataEntry = {
  x: number[]
  y: number[]
  /**
   * The times where spikes are detected.
   * Must be a subset of `x[]`, sorted.
   */
  spikes?: number[]
  type: 'scatter'
  name: string
  recording?: string
  amplitude?: number
  frequency?: number
  varyingKey?: string
  varyingOrder?: number
  visible?: boolean
  line?: { color: string }
  variable_name?: string
  unit?: string
}

export type PlotData = PlotDataEntry[]
