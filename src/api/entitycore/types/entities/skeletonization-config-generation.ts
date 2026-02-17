import type { IActivity, IActivityFilter } from '@/api/entitycore/types/shared/activity';

export interface ISkeletonizationConfigGeneration extends IActivity {}

export interface ISkeletonizationConfigGenerationFilter extends IActivityFilter {}

export type TCreateSkeletonizationConfigGeneration = {
  used: Array<{ id: string }>;
  generated?: Array<{ id: string }>;
};

export type TUpdateSkeletonizationConfigGeneration = {
  status?: string;
  end_time?: string;
};
