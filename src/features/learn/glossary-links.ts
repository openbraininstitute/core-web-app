/*
 * Where a glossary term's "On the platform" paths lead. A path names menus, e.g.
 * ['Data', 'Model', 'ME-model']; this turns it into the page it ends on, within the current
 * project. Data types are looked up by the title the Data nav shows, so the glossary's paths use
 * those titles.
 */

import { kebabCase } from 'es-toolkit/compat';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkflowActivityDictValue } from '@/constants';
import {
  BrowseExperimentalDataExtendedTypes,
  ModelDataExtendedTypes,
  SimulationDataExtendedTypes,
} from '@/ui/segments/explore/helpers';

const DATA_TYPES = new Map<string, string>(
  [
    ...Object.values(BrowseExperimentalDataExtendedTypes),
    ...Object.values(ModelDataExtendedTypes),
    ...Object.values(SimulationDataExtendedTypes),
  ].map((entity) => [entity.title.toLowerCase(), entity.extendedType])
);
// whose title in the nav does not read well in a glossary
DATA_TYPES.set('e-model optimization result', ExtendedEntitiesTypeDict.EModelOptimizationResult);

/** `project` is the project's root, e.g. /app/virtual-lab/<lab>/<project>. */
export function platformHref(path: string[], project: string): string {
  const [section, second] = path;
  const last = path[path.length - 1].toLowerCase();

  switch (section) {
    case 'Data': {
      const type = DATA_TYPES.get(last);
      return type ? `${project}/data/browse/entity/${kebabCase(type)}` : `${project}/data`;
    }
    case 'Workflows': {
      const activity = second?.toLowerCase();
      return activity && Object.values(WorkflowActivityDictValue).includes(activity as never)
        ? `${project}/workflows?activity=${activity}`
        : `${project}/workflows`;
    }
    case 'Notebooks':
      return `${project}/notebooks/browse/${ExtendedEntitiesTypeDict.AnalysisNotebookTemplate}`;
    case 'Top menu':
      return last === 'credits' ? `${project}/credits` : project;
    default:
      return project;
  }
}
