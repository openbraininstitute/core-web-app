import { ViewsDefinition as ExperimentalViewDefinition } from '@/entity-configuration/definitions/view-defs/experimental';

export const ViewsDefinitionRegistry = {
  ...ExperimentalViewDefinition,
} as const;
