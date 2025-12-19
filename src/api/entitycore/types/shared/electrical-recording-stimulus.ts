import type {
  EntityCoreIdentifiableNamed,
  EntityCoreOwnership,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  ContributionFilter,
  OwnershipFilter,
  PaginationFilter,
} from '@/api/entitycore/types/shared/request';

export const ElectricalRecordingStimulusShape = {
  cheops: 'cheops',
  constant: 'constant',
  pulse: 'pulse',
  step: 'step',
  ramp: 'ramp',
  noise: 'noise',
  sinusoidal: 'sinusoidal',
  other: 'other',
  two_steps: 'two_steps',
  unknown: 'unknown',
} as const;

export type ElectricalRecordingStimulusShapeType =
  (typeof ElectricalRecordingStimulusShape)[keyof typeof ElectricalRecordingStimulusShape];

export const ElectricalRecordingStimulusType = {
  voltage_clamp: 'voltage_clamp',
  current_clamp: 'current_clamp',
  conductance_clamp: 'conductance_clamp',
  extracellular: 'extracellular',
  other: 'other',
  unknown: 'unknown',
} as const;

export type ElectricalRecordingStimulusTypeType =
  (typeof ElectricalRecordingStimulusType)[keyof typeof ElectricalRecordingStimulusType];

export interface ElectricalRecordingStimulusBase {
  name: string;
  description: string;
  dt?: number | null;
  injection_type: ElectricalRecordingStimulusTypeType;
  shape: ElectricalRecordingStimulusShapeType;
  start_time?: number | null;
  end_time?: number | null;
  recording_id: string;
}

export interface IElectricalRecordingStimulus
  extends EntityCoreIdentifiableNamed,
    EntityCoreOwnership,
    Timestamps {
  description: string;
  dt?: number | null;
  injection_type: ElectricalRecordingStimulusTypeType;
  shape: ElectricalRecordingStimulusShapeType;
  start_time?: number | null;
  end_time?: number | null;
  recording_id: string;
}

export interface IElectricalRecordingStimulusFilter
  extends PaginationFilter,
    OwnershipFilter,
    ContributionFilter {
  shape: ElectricalRecordingStimulusShapeType | null;
  injection_type: ElectricalRecordingStimulusTypeType | null;
  recording_id: string | null;
  recording_id__in: string | string[] | null;
}
