import { DetailProps } from './types';
import { EntityCoreFields } from '@/constants/explore-section/fields-config/enums';

export type DataTypeConfig = {
  title: string;
  name: string;
  columns: Array<EntityCoreFields>;
  curated: boolean;
  group: DataTypeGroup;
  cardViewFields?: DetailProps[];
  mlTopic?: string;
};

export enum DataTypeGroup {
  ExperimentalData = 'ExperimentalData',
  ModelData = 'ModelData',
  SimulationData = 'SimulationData',
}
