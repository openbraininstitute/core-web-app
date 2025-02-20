import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';
import { extent, bin } from 'd3';
import { expose } from 'comlink';
import { Session } from 'next-auth';
import {
  Utf8,
  Int8,
  Int16,
  Dictionary,
  DictionaryBuilder,
  Float64,
  Float64Builder,
  tableFromIPC,
  tableToIPC,
  Table,
} from '@apache-arrow/es2015-esm';

import {
  IdRev,
  MicroConnectomeConfigPayload,
  MicroConnectomeDataOverridesResource,
  MicroConnectomeEntryBase,
  MicroConnectomeVariantSelectionOverridesResource,
} from '@/types/nexus';
import {
  HemisphereDirection,
  MicroConnectomeEditEntry as EditEntry,
  // MicroConnectomeModifyParamsEditEntry as ModifyParamsEditEntry,
  MicroConnectomeSetAlgorithmEditEntry as SetAlgorithmEditEntry,
  PathwaySideSelection as Selection,
  WholeBrainConnectivityMatrix,
  MicroConnectomeModifyParamsEditEntry,
} from '@/types/connectome';
import {
  fetchFileByUrl,
  fetchLatestRev,
  fetchResourceById,
  updateFileByUrl,
  updateResource,
} from '@/api/nexus';
import { OriginalComposition } from '@/types/composition/original';
import { BrainRegion } from '@/types/ontologies';
import { fromSerialisibleEdit, getFlatArrayValueIdx, toSerialisibleEdit } from '@/util/connectome';
import { PartialBy } from '@/types/common';
import { HEMISPHERE_DIRECTIONS } from '@/constants/connectome';
import { createDistribution, setRev } from '@/util/nexus';

type SrcDstBrainRegionKey = string;
type SrcDstMtypeKey = string;
type BrainRegionNotation = string;
type Mtype = string;

// Consists of hemisphereDirection, variantName and paramName.
type ParamIndexAvailabilityKey = string;

type BrainRegionLevelMap<T> = Map<SrcDstBrainRegionKey, Map<SrcDstMtypeKey, T>>;

type DataIndex<T> = {
  [hemisphereDirection in HemisphereDirection]?: BrainRegionLevelMap<T>;
};

type BrainRegionMtypeMap = Map<BrainRegionNotation, Mtype[]>;
type BrainRegionMtypeNumMap = Map<BrainRegionNotation, number>;

type InitialisedWorkerState = {
  config: MicroConnectomeConfigPayload;
  session: Session;
  edits: EditEntry[];
  initPromise?: Promise<void>;
  brainRegionIndex: {
    brainRegions: BrainRegion[];
    brainRegionNotationByIdMap: Map<string, string>;
    brainRegionByNotationMap: Map<string, BrainRegion>; // TODO Is this used?
    brainRegionByIdMap: Map<string, BrainRegion>;
    brainRegionLeafIdxByNotation: Map<string, number>;
    leafNotationsByNotationMap: Map<string, string[]>;
    nLeafNodes: number;
  };
  macroConnectomeStrengthMatrix: WholeBrainConnectivityMatrix;
  compositionIndex: {
    brainRegionMtypeMap: BrainRegionMtypeMap;
    brainRegionMtypeNumMap: BrainRegionMtypeNumMap;
  };
  tables: {
    variant: {
      initial: Table;
      overrides: Table;
    };
    params: {
      initial: {
        [variantName: string]: Table;
      };
      overrides: {
        [variantName: string]: Table;
      };
    };
  };
  variantIndex: DataIndex<number>;
  paramIndex: {
    [variantName: string]: DataIndex<number[]>;
  };
  // refactor to use Set
  paramIndexAvailability: Map<ParamIndexAvailabilityKey, boolean>;
};

type WorkerState = PartialBy<
  InitialisedWorkerState,
  | 'config'
  | 'edits'
  | 'session'
  | 'brainRegionIndex'
  | 'compositionIndex'
  | 'macroConnectomeStrengthMatrix'
  | 'tables'
>;

type IndexScope = {
  variantName: string;
  paramName?: string;
};

const gzRe = /^.*\.gz$/;

const workerState: WorkerState = {
  paramIndex: {},
  variantIndex: {},
  paramIndexAvailability: new Map(),
};

const KEY_DELIMITER = '.';

function createKey(...components: string[]): string {
  return components.join(KEY_DELIMITER);
}

function parseKey(key: string) {
  return key.split(KEY_DELIMITER);
}

type LinearTransformValue = {
  multiplier: number;
  offset: number;
};

function isNonZeroTransform({ multiplier, offset }: LinearTransformValue) {
  return multiplier !== 1 || offset !== 0;
}

function hasMacroConnectivity(
  hemisphereDirection: HemisphereDirection,
  srcNotation: string,
  dstNotation: string
) {
  assertInitialised(workerState);

  const { brainRegionLeafIdxByNotation, nLeafNodes } = workerState.brainRegionIndex;
  const macroConnectomeFlatArray = workerState.macroConnectomeStrengthMatrix[hemisphereDirection];

  const srcIdx = brainRegionLeafIdxByNotation.get(srcNotation) as number;
  const dstIdx = brainRegionLeafIdxByNotation.get(dstNotation) as number;

  const flatArrayIdx = getFlatArrayValueIdx(nLeafNodes, srcIdx, dstIdx);
  const macroStrength = macroConnectomeFlatArray[flatArrayIdx];

  return macroStrength !== 0;
}

function getIndexedParamNames(hemisphereDirection: HemisphereDirection, variantName: string) {
  assertInitialised(workerState);

  return Array.from(workerState.paramIndexAvailability.entries())
    .filter(([, available]) => available)
    .map(([indexedParamKey]) => parseKey(indexedParamKey))
    .filter(
      ([indexedHemisphereDirection, indexedVariantName]) =>
        indexedHemisphereDirection === hemisphereDirection && indexedVariantName === variantName
    )
    .map(([, , indexedParamName]) => indexedParamName);
}

function setParamIndexAvailability(
  hemisphereDirection: HemisphereDirection,
  variantName: string,
  paramName: string,
  available: boolean
) {
  const paramIndexKey = createKey(hemisphereDirection, variantName, paramName);
  workerState.paramIndexAvailability.set(paramIndexKey, available);
}

function isParamIndexAvailable(
  hemisphereDirection: HemisphereDirection,
  variantName: string,
  paramName: string
): boolean {
  const paramIndexKey = createKey(hemisphereDirection, variantName, paramName);
  return !!workerState.paramIndexAvailability.get(paramIndexKey);
}

// TODO Use compression when the support for gzipped arrow files arrives to the workflow.
// function compress(readableStream: ReadableStream): ReadableStream {
//   return readableStream.pipeThrough(new CompressionStream('gzip'));
// }

function decompress(readableStream: ReadableStream): ReadableStream {
  const ds = new DecompressionStream('gzip');

  return readableStream.pipeThrough(ds);
}

function isEditApplicable(
  type: 'variant' | 'param',
  hemisphereDirection: HemisphereDirection,
  edit: EditEntry
) {
  return (
    edit.hemisphereDirection === hemisphereDirection &&
    (type === 'variant' ? edit.operation === 'setAlgorithm' : true)
  );
}

// TODO Uncomment when the save of overrides is enabled.
// function isPristine(type: 'variant' | 'param', hemisphereDirection: HemisphereDirection): boolean {
//   assertInitialised(workerState);

//   if (!workerState.config) {
//     throw new Error('Worker not initialised');
//   }

//   const applicableEditFilterFn = (edit: EditEntry) =>
//     isEditApplicable(type, hemisphereDirection, edit);

//   const configEdits = workerState.config._ui_data?.editHistory
//     ?.map((serialisibleEdit) => fromSerialisibleEdit(serialisibleEdit))
//     .filter(applicableEditFilterFn);

//   const currentEdits = workerState.edits?.filter(applicableEditFilterFn);

//   return isEqual(configEdits, currentEdits);
// }

function assertInitialised(state: WorkerState): asserts state is InitialisedWorkerState {
  if (
    !state.config ||
    !state.session ||
    !workerState.tables ||
    !state.brainRegionIndex ||
    !state.compositionIndex ||
    !state.macroConnectomeStrengthMatrix
  ) {
    throw new Error('Worker is not initialised');
  }
}

// function variantIndexExists(hemisphereDirection: HemisphereDirection): boolean {
//   return !!workerState.variantIndex[hemisphereDirection];
// }

// function paramIndexExists(
//   hemisphereDirection: HemisphereDirection,
//   variantName: string,
//   paramName: string
// ): boolean {
//   return !workerState.paramIndexAvailability.get(
//     `${hemisphereDirection}.${variantName}.${paramName}`
//   );
// }

function buildBrainRegionIndex(brainRegions: BrainRegion[]) {
  const brainRegionNotationByIdMap: Map<string, string> = new Map();
  const brainRegionByNotationMap: Map<string, BrainRegion> = new Map();
  const brainRegionByIdMap: Map<string, BrainRegion> = new Map();

  brainRegions.forEach((brainRegion) => {
    brainRegionNotationByIdMap.set(brainRegion.id, brainRegion.notation);
    brainRegionByNotationMap.set(brainRegion.notation, brainRegion);
    brainRegionByIdMap.set(brainRegion.id, brainRegion);
  });

  const leafNotationsByNotationMap: Map<string, string[]> = brainRegions.reduce(
    (map, brainRegion) => {
      const { notation } = brainRegion;

      const leafNotations = brainRegion?.leaves
        ?.map((leadId) => brainRegionByIdMap.get(leadId))
        .filter((leaf) => leaf?.representedInAnnotation) // TODO: Update init() function to use brainRegionsWithRepresentationAtom, and then remove this line.
        ?.map((br) => br?.notation as string);

      if (Array.isArray(leafNotations) && leafNotations.length === 0) {
        return map.set(notation, []);
      }

      return map.set(notation, leafNotations ?? [notation]);
    },
    new Map()
  );

  const leafNodes = brainRegions.filter((brainRegion) => !brainRegion.leaves);
  const nLeafNodes = leafNodes.length;

  const brainRegionLeafIdxByNotation: Map<string, number> = leafNodes.reduce(
    (map, brainRegion, idx) => map.set(brainRegion.notation, idx),
    new Map()
  );

  workerState.brainRegionIndex = {
    brainRegions,
    brainRegionNotationByIdMap,
    brainRegionByNotationMap,
    brainRegionByIdMap,
    leafNotationsByNotationMap,
    brainRegionLeafIdxByNotation,
    nLeafNodes,
  };
}

function buildCompositionIndex(cellComposition: OriginalComposition) {
  if (!workerState.brainRegionIndex) {
    throw new Error('Brain region index is missing');
  }

  const { brainRegionNotationByIdMap } = workerState.brainRegionIndex;

  const brainRegionMtypeMap = Object.keys(cellComposition.hasPart).reduce((map, brainRegionId) => {
    const brainRegionNotation = brainRegionNotationByIdMap.get(brainRegionId);

    const mtypes = Object.values(cellComposition.hasPart[brainRegionId].hasPart)
      .map((mtypeEntry) => mtypeEntry.label)
      .sort();

    return map.set(brainRegionNotation, mtypes);
  }, new Map());

  // TODO Check if this is used.
  const brainRegionMtypeNumMap = Array.from(brainRegionMtypeMap.entries()).reduce(
    (map, [notation, mtypes]) => map.set(notation, mtypes.length),
    new Map()
  );

  workerState.compositionIndex = {
    brainRegionMtypeMap,
    brainRegionMtypeNumMap,
  };
}

type CreateVariantIndexFnOptions = {
  applyOverrides: boolean;
};

function createVariantIndex(
  hemisphereDirection: HemisphereDirection,
  { applyOverrides }: CreateVariantIndexFnOptions
): BrainRegionLevelMap<number> {
  if (!workerState.tables) {
    throw new Error('Micro-connectome data is missing');
  }

  if (!workerState.config) {
    throw new Error('Config is not set');
  }

  // Leaving entry with index 0 for "disabled" pathways.
  const variantIdxByName = Object.keys(workerState.config?.variants)
    .sort()
    .reduce((map, variantName, idx) => map.set(variantName, idx + 1), new Map());

  const initialTable = workerState.tables.variant.initial;
  const overridesTable = workerState.tables.variant.overrides;

  const hemisphereVariantIndex: BrainRegionLevelMap<number> = new Map();

  const applyEntry = (entry: any) => {
    const brainRegionKey = createKey(entry.source_region, entry.target_region);

    if (!hasMacroConnectivity(hemisphereDirection, entry.source_region, entry.target_region))
      return;

    const mtypeKey = createKey(entry.source_mtype, entry.target_mtype);

    const variantIdx = variantIdxByName.get(entry.variant);

    const mtypeLevelMap = hemisphereVariantIndex.get(brainRegionKey);

    if (!mtypeLevelMap) {
      hemisphereVariantIndex.set(brainRegionKey, new Map().set(mtypeKey, variantIdx));
      return;
    }

    mtypeLevelMap.set(mtypeKey, variantIdx);
  };

  const applyTable = (table: Table) => {
    const { numRows } = table;
    const batch = table.batches[0];
    const sideColIdx = table.schema.fields.findIndex((field) => field.name === 'side');
    const sideVec = batch.getChildAt(sideColIdx);

    if (!sideVec) {
      throw new Error('Can not get Vector for .side property');
    }

    for (let i = 0; i < numRows; i += 1) {
      if (sideVec.get(i) === hemisphereDirection) {
        applyEntry(batch.get(i));
      }
    }
  };

  applyTable(initialTable);

  if (applyOverrides) {
    applyTable(overridesTable);
  }

  return hemisphereVariantIndex;
}

function buildVariantIndex(hemisphereDirection: HemisphereDirection) {
  // TODO Revert when the save of overrides is enabled
  // const pristine = isPristine('variant', hemisphereDirection);
  const pristine = false;

  const applyOverrides = pristine;

  const variantIndex = createVariantIndex(hemisphereDirection, { applyOverrides });
  workerState.variantIndex[hemisphereDirection] = variantIndex;

  if (!pristine) {
    const applicableEdits = workerState.edits?.filter((edit) =>
      isEditApplicable('variant', hemisphereDirection, edit)
    );
    applicableEdits?.forEach((edit) => applyEdit(edit));
  }
}

type CreateParamIndexFnOptions = {
  applyOverrides: boolean;
};

function createParamIndex(
  hemisphereDirection: HemisphereDirection,
  variantName: string,
  paramName: string | undefined,
  { applyOverrides }: CreateParamIndexFnOptions
): BrainRegionLevelMap<number[]> {
  if (!workerState.tables) {
    throw new Error('Micro-connectome data is missing');
  }

  if (!workerState.config) {
    throw new Error('Config is not set');
  }

  const paramNames = Object.keys(workerState.config.variants[variantName].params).sort();
  const paramIdx = paramName ? paramNames.indexOf(paramName) : null;

  const initialTable = workerState.tables.params.initial[variantName];
  const overridesTable = workerState.tables.params.overrides[variantName];

  const hemisphereParamIndex: BrainRegionLevelMap<number[]> =
    workerState.paramIndex[variantName]?.[hemisphereDirection] ?? new Map();

  const applyEntryForSingleParam = (entry: any) => {
    const paramValue = entry[paramName as string];

    const brainRegionKey = createKey(entry.source_region, entry.target_region);
    const mtypeKey = createKey(entry.source_mtype, entry.target_mtype);

    const mtypeLevelMap = hemisphereParamIndex.get(brainRegionKey);

    if (!mtypeLevelMap) {
      const newParamArray = [];
      newParamArray[paramIdx as number] = paramValue;

      hemisphereParamIndex.set(brainRegionKey, new Map().set(mtypeKey, newParamArray));

      return;
    }

    const paramArray = mtypeLevelMap.get(mtypeKey);

    if (paramArray) {
      paramArray[paramIdx as number] = paramValue;
    } else {
      const newParamArray = [];
      newParamArray[paramIdx as number] = paramValue;
      mtypeLevelMap.set(mtypeKey, newParamArray);
    }
  };

  const applyEntryForAllParams = (entry: any) => {
    const paramValues = paramNames.map((currParamName) => entry[currParamName]);

    const brainRegionKey = createKey(entry.source_region, entry.target_region);
    const mtypeKey = createKey(entry.source_mtype, entry.target_mtype);

    const mtypeLevelMap = hemisphereParamIndex.get(brainRegionKey);

    if (!mtypeLevelMap) {
      hemisphereParamIndex.set(brainRegionKey, new Map().set(mtypeKey, paramValues));

      return;
    }

    mtypeLevelMap.set(mtypeKey, paramValues);
  };

  const applyEntryFn = paramName ? applyEntryForSingleParam : applyEntryForAllParams;

  const applyTable = (allVariantParamsTable: Table) => {
    // Construct a new table containing only a relevant parameter to prevent performance impact
    // caused by the execution of getters for unused params.
    const fieldNames = allVariantParamsTable.schema.fields
      .map((field) => field.name)
      .filter(
        (fieldName) => !paramName || !paramNames.includes(fieldName) || fieldName === paramName
      );

    const table = allVariantParamsTable.select(fieldNames);

    const { numRows } = table;
    const batch = table.batches[0];
    const sideColIdx = table.schema.fields.findIndex((field) => field.name === 'side');
    const sideVec = batch.getChildAt(sideColIdx);

    if (!sideVec) {
      throw new Error('Can not get Vector for .side property');
    }

    for (let i = 0; i < numRows; i += 1) {
      if (sideVec.get(i) === hemisphereDirection) {
        applyEntryFn(batch.get(i));
      }
    }
  };

  applyTable(initialTable);

  if (applyOverrides) {
    applyTable(overridesTable);
  }

  return hemisphereParamIndex;
}

function buildParamIndex(
  hemisphereDirection: HemisphereDirection,
  variantName: string,
  paramName?: string
) {
  assertInitialised(workerState);

  // TODO Revert when the save of overrides is enabled
  // const pristine = isPristine('param', hemisphereDirection);
  const pristine = false;

  const applyOverrides = pristine;

  const paramNames = Object.keys(workerState.config.variants[variantName].params).sort();

  const hemisphereParamIndex = createParamIndex(hemisphereDirection, variantName, paramName, {
    applyOverrides,
  });

  workerState.paramIndex[variantName] = {
    ...workerState.paramIndex[variantName],
    [hemisphereDirection]: hemisphereParamIndex,
  };

  if (paramName) {
    setParamIndexAvailability(hemisphereDirection, variantName, paramName, true);
  } else {
    paramNames.forEach((currParamName) =>
      setParamIndexAvailability(hemisphereDirection, variantName, currParamName, true)
    );
  }

  if (!pristine) {
    const applicableEdits = workerState.edits?.filter((edit) =>
      isEditApplicable('param', hemisphereDirection, edit)
    );
    applicableEdits?.forEach((edit) => applyEdit(edit, { variantName, paramName }));
  }
}

async function fetchDistribution(entity: IdRev, session: Session): Promise<ArrayBuffer> {
  const containerEntity = await fetchResourceById<MicroConnectomeEntryBase>(entity.id, session, {
    rev: entity.rev,
  });

  const fileUrl = containerEntity.distribution.contentUrl;

  const distributionFetch = await fetchFileByUrl(fileUrl, session);

  if (!distributionFetch.ok) {
    throw new Error(`NOK while fetching a file: ${fileUrl}`);
  }

  if (!distributionFetch.body) {
    throw new Error(`Empty body for a file: ${fileUrl}`);
  }

  const dataStream = gzRe.test(containerEntity.distribution.name)
    ? decompress(distributionFetch.body)
    : distributionFetch.body;

  return new Response(dataStream).arrayBuffer();
}

async function fetchData(session: Session) {
  const microConnectomeConfig = workerState.config;

  if (!microConnectomeConfig) {
    throw new Error('Micro-connectome config is not defined');
  }

  const initialVariantMatrixPromise = fetchDistribution(
    microConnectomeConfig.initial.variants,
    session
  );
  const overridesVariantMatrixPromise = fetchDistribution(
    microConnectomeConfig.overrides.variants,
    session
  );

  const variantNames = Object.keys(microConnectomeConfig.variants).sort();

  const initialParamMatrixPromises = variantNames.map((variantName) =>
    fetchDistribution(microConnectomeConfig.initial[variantName], session)
  );

  const overridesParamMatrixPromises = variantNames.map((variantName) =>
    fetchDistribution(microConnectomeConfig.overrides[variantName], session)
  );

  const initialVariantTable = tableFromIPC(await initialVariantMatrixPromise);
  const overridesVariantTable = tableFromIPC(await overridesVariantMatrixPromise);

  const initialParamABs = await Promise.all(initialParamMatrixPromises);
  const initialParamTableMap: { [variantName: string]: Table } = initialParamABs.reduce(
    (map, matrixAB, idx) => ({ ...map, [variantNames[idx]]: tableFromIPC(matrixAB) }),
    {}
  );

  const overridesParamABs = await Promise.all(overridesParamMatrixPromises);
  const overridesParamTableMap: { [variantName: string]: Table } = overridesParamABs.reduce(
    (map, matrixAB, idx) => ({ ...map, [variantNames[idx]]: tableFromIPC(matrixAB) }),
    {}
  );

  workerState.tables = {
    variant: {
      initial: initialVariantTable,
      overrides: overridesVariantTable,
    },
    params: {
      initial: initialParamTableMap,
      overrides: overridesParamTableMap,
    },
  };
}

async function init(
  microConnectomeConfig: MicroConnectomeConfigPayload,
  cellComposition: OriginalComposition,
  brainRegions: BrainRegion[],
  macroConnectomeStrengthMatrix: WholeBrainConnectivityMatrix,
  session: Session
): Promise<void> {
  if (!session) {
    throw new Error('Session should be defined');
  }

  // TODO Use '_ui_data?.editHistory' for comparison as well.
  const configCompareKeys = ['initial', 'overrides', 'variants'];

  if (
    isEqual(
      pick(workerState.config, configCompareKeys),
      pick(microConnectomeConfig, configCompareKeys)
    )
  ) {
    await workerState.initPromise;
    return;
  }

  workerState.config = microConnectomeConfig;

  workerState.session = session;

  workerState.edits = microConnectomeConfig._ui_data?.editHistory?.map((serialisibleEdit) =>
    fromSerialisibleEdit(serialisibleEdit)
  );

  workerState.macroConnectomeStrengthMatrix = macroConnectomeStrengthMatrix;

  workerState.initPromise = new Promise((initDone) => {
    Promise.all([
      fetchData(session),
      buildBrainRegionIndex(brainRegions),
      buildCompositionIndex(cellComposition),
    ]).then(() => initDone());
  });

  await workerState.initPromise;
}

export type InitFn = typeof init;

export type AggregatedVariantViewEntry = {
  srcSelection: Selection;
  dstSelection: Selection;
  variantCount: {
    [variantName: string]: number;
  };
};

function createAggregatedVariantView(
  hemisphereDirection: HemisphereDirection,
  srcSelections: Selection[],
  dstSelections: Selection[]
): AggregatedVariantViewEntry[] {
  assertInitialised(workerState);

  if (!workerState.variantIndex[hemisphereDirection]) {
    buildVariantIndex(hemisphereDirection);
  }

  const hemisphereVariantIndex = workerState.variantIndex[hemisphereDirection];
  const { brainRegionMtypeMap } = workerState.compositionIndex;
  const { leafNotationsByNotationMap } = workerState.brainRegionIndex;

  if (!hemisphereVariantIndex) {
    throw new Error('This is totally unexpected');
  }

  const viewData: AggregatedVariantViewEntry[] = [];

  const variantNames = Object.keys(workerState.config.variants).sort();
  const nVariants = variantNames.length;

  srcSelections.forEach((srcSelection) => {
    dstSelections.forEach((dstSelection) => {
      // The element with index 0 represents the number of pathways for which no variant has been assigned.
      // This is what will be rendered under the "disabled" category.
      const variantCountsArr = new Uint32Array(nVariants + 1);

      const srcNotations = leafNotationsByNotationMap.get(srcSelection.brainRegionNotation);
      const dstNotations = leafNotationsByNotationMap.get(dstSelection.brainRegionNotation);

      if (!srcNotations || !dstNotations) {
        const src = srcSelection.brainRegionNotation;
        const dst = dstSelection.brainRegionNotation;
        throw new Error(`Can not get leaf nodes for (${src}, ${dst})`);
      }

      srcNotations.forEach((srcNotation) => {
        dstNotations.forEach((dstNotation) => {
          if (!hasMacroConnectivity(hemisphereDirection, srcNotation, dstNotation)) return;

          const srcDstBrainRegionKey = createKey(srcNotation, dstNotation);

          const srcMtypes = (
            srcSelection.mtype ? [srcSelection.mtype] : (brainRegionMtypeMap.get(srcNotation) ?? [])
          ).filter(
            (mtype) => !srcSelection.mtypeFilterSet || srcSelection.mtypeFilterSet.has(mtype)
          );

          const dstMtypes = (
            dstSelection.mtype ? [dstSelection.mtype] : (brainRegionMtypeMap.get(dstNotation) ?? [])
          ).filter(
            (mtype) => !dstSelection.mtypeFilterSet || dstSelection.mtypeFilterSet.has(mtype)
          );

          const srcDstMtypeMap = hemisphereVariantIndex.get(srcDstBrainRegionKey);

          if (!srcDstMtypeMap) {
            const nPathwaysNotSet = srcMtypes.length * dstMtypes.length;
            variantCountsArr[0] += nPathwaysNotSet;
            return;
          }

          srcMtypes.forEach((srcMtype) => {
            dstMtypes.forEach((dstMtype) => {
              const srcDstMtypeKey = createKey(srcMtype, dstMtype);
              const variantIdx = srcDstMtypeMap.get(srcDstMtypeKey) ?? 0;
              variantCountsArr[variantIdx] += 1;
            });
          });
        });
      });

      viewData.push({
        srcSelection,
        dstSelection,
        variantCount: variantCountsArr.reduce(
          (mapObj, count, idx) => ({ ...mapObj, [variantNames[idx - 1] ?? 'disabled']: count }),
          {}
        ),
      });
    });
  });

  return viewData;
}

export type CreateAggregatedVariantViewFn = typeof createAggregatedVariantView;

export type AggregatedParamViewEntry = {
  srcSelection: Selection;
  dstSelection: Selection;
  min: number;
  max: number;
  bins: { x0: number; x1: number; count: number }[];
  nPathwaysNotSet: number;
  noData: boolean;
};

export function createAggregatedParamView(
  hemisphereDirection: HemisphereDirection,
  variantName: string,
  paramName: string,
  srcSelections: Selection[],
  dstSelections: Selection[]
): AggregatedParamViewEntry[] {
  assertInitialised(workerState);

  if (!isParamIndexAvailable(hemisphereDirection, variantName, paramName)) {
    buildParamIndex(hemisphereDirection, variantName, paramName);
  }

  const hemisphereParamIndex = workerState.paramIndex[variantName][hemisphereDirection];
  const { brainRegionMtypeMap } = workerState.compositionIndex;
  const { leafNotationsByNotationMap } = workerState.brainRegionIndex;

  if (!hemisphereParamIndex) {
    throw new Error('This is totally unexpected');
  }

  const paramIdx = Object.keys(workerState.config.variants[variantName].params)
    .sort()
    .indexOf(paramName);

  const viewData: AggregatedParamViewEntry[] = [];

  srcSelections.forEach((srcSelection) => {
    dstSelections.forEach((dstSelection) => {
      const paramValues: number[] = [];
      let nPathwaysNotSet: number = 0;

      const srcNotations = leafNotationsByNotationMap.get(srcSelection.brainRegionNotation);
      const dstNotations = leafNotationsByNotationMap.get(dstSelection.brainRegionNotation);

      if (!srcNotations || !dstNotations) {
        const src = srcSelection.brainRegionNotation;
        const dst = dstSelection.brainRegionNotation;
        throw new Error(`Can not get leaf nodes for (${src}, ${dst})`);
      }

      srcNotations.forEach((srcNotation) => {
        dstNotations.forEach((dstNotation) => {
          if (!hasMacroConnectivity(hemisphereDirection, srcNotation, dstNotation)) return;

          const srcDstBrainRegionKey = createKey(srcNotation, dstNotation);

          const srcMtypes = (
            srcSelection.mtype ? [srcSelection.mtype] : (brainRegionMtypeMap.get(srcNotation) ?? [])
          ).filter(
            (mtype) => !srcSelection.mtypeFilterSet || srcSelection.mtypeFilterSet.has(mtype)
          );

          const dstMtypes = (
            dstSelection.mtype ? [dstSelection.mtype] : (brainRegionMtypeMap.get(dstNotation) ?? [])
          ).filter(
            (mtype) => !srcSelection.mtypeFilterSet || srcSelection.mtypeFilterSet.has(mtype)
          );

          const srcDstMtypeMap = hemisphereParamIndex.get(srcDstBrainRegionKey);

          if (!srcDstMtypeMap) {
            nPathwaysNotSet += srcMtypes.length * dstMtypes.length;
            return;
          }

          srcMtypes.forEach((srcMtype) => {
            dstMtypes.forEach((dstMtype) => {
              const srcDstMtypeKey = createKey(srcMtype, dstMtype);
              const paramValue = srcDstMtypeMap.get(srcDstMtypeKey)?.[paramIdx];

              if (paramValue !== undefined) {
                // TODO remove randomisation
                // paramValues.push(paramValue as number); // TODO fix the type/type-check.
                if (Math.random() < 0.05) {
                  paramValues.push(Math.random());
                  return;
                }

                paramValues.push((paramValue as number) * (1.2 + Math.random() / 2.5));
              } else {
                nPathwaysNotSet += 1;
              }
            });
          });
        });
      });

      const [paramValMin, paramValMax] = extent(paramValues);
      const min = paramValMin === paramValMax ? 0 : (paramValMin ?? 0);
      const max = paramValMax ?? 1;

      const nBins = 10;
      const thresholdArr = new Array(nBins).fill(1).map((_, idx) => (max / nBins) * idx);

      const bins = bin()
        .domain([min, max])
        .thresholds(thresholdArr)(paramValues)
        .map((binEntry) => ({
          x0: binEntry.x0 as number,
          x1: binEntry.x1 as number,
          count: binEntry.length,
        }));

      const noData = bins.reduce((nVals, binEntry) => nVals + binEntry.count, 0) === 0;

      viewData.push({
        srcSelection,
        dstSelection,
        nPathwaysNotSet,
        min,
        max,
        bins,
        noData,
      });
    });
  });

  return viewData;
}

export type CreateAggregatedParamViewFn = typeof createAggregatedParamView;

function setVariant(
  hemisphereDirection: HemisphereDirection,
  srcSelection: Selection,
  dstSelection: Selection,
  variantName: string
) {
  assertInitialised(workerState);

  // Applying changes only for existing indexes
  const hemisphereVariantIndex = workerState.variantIndex[hemisphereDirection];
  if (!hemisphereVariantIndex) return;

  const { leafNotationsByNotationMap } = workerState.brainRegionIndex;
  const { brainRegionMtypeMap } = workerState.compositionIndex;

  const variantIdx = Object.keys(workerState.config.variants).sort().indexOf(variantName) + 1;

  const srcNotations = leafNotationsByNotationMap.get(srcSelection.brainRegionNotation);
  const dstNotations = leafNotationsByNotationMap.get(dstSelection.brainRegionNotation);

  srcNotations?.forEach((srcNotation) => {
    dstNotations?.forEach((dstNotation) => {
      if (!hasMacroConnectivity(hemisphereDirection, srcNotation, dstNotation)) return;

      const srcDstBrainRegionKey = createKey(srcNotation, dstNotation);

      const srcMtypes = (brainRegionMtypeMap.get(srcNotation) ?? []).filter(
        (mtype) => !srcSelection.mtypeFilterSet || srcSelection.mtypeFilterSet.has(mtype)
      );

      const dstMtypes = (brainRegionMtypeMap.get(dstNotation) ?? []).filter(
        (mtype) => !dstSelection.mtypeFilterSet || dstSelection.mtypeFilterSet.has(mtype)
      );

      const srcDstMtypeMapExists = hemisphereVariantIndex.get(srcDstBrainRegionKey);
      const srcDstMtypeMap = hemisphereVariantIndex.get(srcDstBrainRegionKey) ?? new Map();

      if (srcMtypes.length === 0 || dstMtypes.length === 0) return;

      if (!srcDstMtypeMapExists) {
        hemisphereVariantIndex.set(srcDstBrainRegionKey, srcDstMtypeMap);
      }

      srcMtypes.forEach((srcMtype) => {
        dstMtypes.forEach((dstMtype) => {
          const srcDstMtypeKey = createKey(srcMtype, dstMtype);
          srcDstMtypeMap.set(srcDstMtypeKey, variantIdx);
        });
      });
    });
  });
}

function setParams(
  hemisphereDirection: HemisphereDirection,
  srcSelection: Selection,
  dstSelection: Selection,
  variantName: string,
  params: { [paramName: string]: number },
  scope?: IndexScope
) {
  assertInitialised(workerState);

  if (scope && scope.variantName !== variantName) return;

  const paramIdxByNameMap: Map<string, number> = Object.keys(
    workerState.config.variants[variantName].params
  )
    .sort()
    .reduce((map, paramName, idx) => map.set(paramName, idx), new Map());

  const indexedParamNames = getIndexedParamNames(hemisphereDirection, variantName);

  if (!indexedParamNames.length) return;

  const { leafNotationsByNotationMap } = workerState.brainRegionIndex;
  const { brainRegionMtypeMap } = workerState.compositionIndex;

  const paramNamesToSet = indexedParamNames.filter(
    (paramName) => !scope || !scope.paramName || scope.paramName === paramName
  );

  const hemisphereParamIndex = workerState.paramIndex[variantName][hemisphereDirection];
  if (!hemisphereParamIndex) {
    throw new Error('HemisphereParamIndex not defined despite marked as such');
  }

  const srcNotations = leafNotationsByNotationMap.get(srcSelection.brainRegionNotation);
  const dstNotations = leafNotationsByNotationMap.get(dstSelection.brainRegionNotation);

  const applyParamArrayChange = (paramArray: number[]) => {
    paramNamesToSet.forEach((paramName) => {
      const paramIdx = paramIdxByNameMap.get(paramName) as number;
      // eslint-disable-next-line no-param-reassign
      paramArray[paramIdx] = params[paramName];
    });
  };

  srcNotations?.forEach((srcNotation) => {
    dstNotations?.forEach((dstNotation) => {
      if (!hasMacroConnectivity(hemisphereDirection, srcNotation, dstNotation)) return;

      const srcDstBrainRegionKey = createKey(srcNotation, dstNotation);

      const srcMtypes = (brainRegionMtypeMap.get(srcNotation) ?? []).filter(
        (mtype) => !srcSelection.mtypeFilterSet || srcSelection.mtypeFilterSet.has(mtype)
      );

      const dstMtypes = (brainRegionMtypeMap.get(dstNotation) ?? []).filter(
        (mtype) => !dstSelection.mtypeFilterSet || dstSelection.mtypeFilterSet.has(mtype)
      );

      const mtypeLevelMapExists = hemisphereParamIndex.get(srcDstBrainRegionKey);
      const mtypeLevelMap = hemisphereParamIndex.get(srcDstBrainRegionKey) ?? new Map();

      if (!mtypeLevelMapExists) {
        hemisphereParamIndex.set(srcDstBrainRegionKey, mtypeLevelMap);
      }

      srcMtypes.forEach((srcMtype) => {
        dstMtypes.forEach((dstMtype) => {
          const mtypeKey = createKey(srcMtype, dstMtype);

          const paramArray = mtypeLevelMap.get(mtypeKey);

          if (paramArray) {
            applyParamArrayChange(paramArray);
          } else {
            const newParamArray: number[] = [];
            applyParamArrayChange(newParamArray);
            mtypeLevelMap.set(mtypeKey, newParamArray);
          }
        });
      });
    });
  });
}

function removeParamIndex(
  hemisphereDirection: HemisphereDirection,
  variantName: string,
  paramName: string
) {
  setParamIndexAvailability(hemisphereDirection, variantName, paramName, false);
  if (workerState.paramIndex[variantName]?.[hemisphereDirection]) {
    delete workerState.paramIndex[variantName][hemisphereDirection];
  }
}

function removeAffectedIndex(edit: EditEntry) {
  assertInitialised(workerState);

  if (edit.operation === 'setAlgorithm') {
    delete workerState.variantIndex[edit.hemisphereDirection];
    const indexedParamNames = Array.from(workerState.paramIndexAvailability.keys())
      .map((paramIndexKey) => parseKey(paramIndexKey))
      .filter(
        ([hemisphereDirection, variantName]) =>
          hemisphereDirection === edit.hemisphereDirection && variantName === edit.variantName
      )
      .map(([, , paramName]) => paramName);

    indexedParamNames.forEach((paramName) =>
      removeParamIndex(edit.hemisphereDirection, edit.variantName, paramName)
    );
  } else if (edit.operation === 'modifyParams') {
    Object.entries(edit.params).forEach(([paramName, linearTransformValue]) => {
      if (!isNonZeroTransform(linearTransformValue)) return;

      removeParamIndex(edit.hemisphereDirection, edit.variantName, paramName);
    });
  }
}

function applySetAlgorithmEdit(edit: SetAlgorithmEditEntry, scope?: IndexScope) {
  setVariant(edit.hemisphereDirection, edit.srcSelection, edit.dstSelection, edit.variantName);

  setParams(
    edit.hemisphereDirection,
    edit.srcSelection,
    edit.dstSelection,
    edit.variantName,
    edit.params,
    scope
  );
}

function applyModifyParamsEdit(edit: MicroConnectomeModifyParamsEditEntry, scope?: IndexScope) {
  assertInitialised(workerState);

  if (scope && scope.variantName !== edit.variantName) return;

  const { hemisphereDirection, variantName, srcSelection, dstSelection, params } = edit;

  const paramIdxByNameMap: Map<string, number> = Object.keys(
    workerState.config.variants[variantName].params
  )
    .sort()
    .reduce((map, paramName, idx) => map.set(paramName, idx), new Map());

  const indexedParamNames = getIndexedParamNames(hemisphereDirection, variantName);

  if (!indexedParamNames.length) return;

  const { leafNotationsByNotationMap } = workerState.brainRegionIndex;
  const { brainRegionMtypeMap } = workerState.compositionIndex;

  const paramNamesToSet = indexedParamNames.filter(
    (paramName) => !scope || !scope.paramName || scope.paramName === paramName
  );

  const hemisphereParamIndex = workerState.paramIndex[variantName][hemisphereDirection];
  if (!hemisphereParamIndex) {
    throw new Error('HemisphereParamIndex not defined despite marked as such');
  }

  const srcNotations = leafNotationsByNotationMap.get(srcSelection.brainRegionNotation);
  const dstNotations = leafNotationsByNotationMap.get(dstSelection.brainRegionNotation);

  const applyParamArrayChange = (paramArray: number[]) => {
    paramNamesToSet.forEach((paramName) => {
      const paramIdx = paramIdxByNameMap.get(paramName) as number;
      const currentValue = paramArray[paramIdx];
      const { offset, multiplier } = params[paramName];
      // eslint-disable-next-line no-param-reassign
      paramArray[paramIdx] = currentValue * multiplier + offset;
    });
  };

  srcNotations?.forEach((srcNotation) => {
    dstNotations?.forEach((dstNotation) => {
      if (!hasMacroConnectivity(hemisphereDirection, srcNotation, dstNotation)) return;

      const srcDstBrainRegionKey = createKey(srcNotation, dstNotation);

      const srcMtypes = (brainRegionMtypeMap.get(srcNotation) ?? []).filter(
        (mtype) => !srcSelection.mtypeFilterSet || srcSelection.mtypeFilterSet.has(mtype)
      );

      const dstMtypes = (brainRegionMtypeMap.get(dstNotation) ?? []).filter(
        (mtype) => !dstSelection.mtypeFilterSet || dstSelection.mtypeFilterSet.has(mtype)
      );

      const mtypeLevelMap = hemisphereParamIndex.get(srcDstBrainRegionKey);

      if (!mtypeLevelMap) return;

      srcMtypes.forEach((srcMtype) => {
        dstMtypes.forEach((dstMtype) => {
          const mtypeKey = createKey(srcMtype, dstMtype);
          const paramArray = mtypeLevelMap.get(mtypeKey);

          if (!paramArray) return;

          applyParamArrayChange(paramArray);
        });
      });
    });
  });
}

/**
 * Apply an edit to existing partial indexed views.
 */
function applyEdit(edit: EditEntry, scope?: IndexScope) {
  switch (edit.operation) {
    case 'setAlgorithm':
      applySetAlgorithmEdit(edit, scope);
      break;
    case 'modifyParams':
      applyModifyParamsEdit(edit, scope);
      break;
    default:
      break;
  }
}

async function addEdit(edit: EditEntry) {
  assertInitialised(workerState);

  workerState.edits.push(edit);

  applyEdit(edit);
}

export type AddEditFn = typeof addEdit;

function removeEdit(editToRemove: EditEntry) {
  assertInitialised(workerState);

  removeAffectedIndex(editToRemove);

  workerState.edits = workerState.edits.filter((edit) => edit.id !== editToRemove.id);
}

export type RemoveEditFn = typeof removeEdit;

function updateEdit(updatedEdit: EditEntry) {
  assertInitialised(workerState);

  const previousEdit = workerState.edits.find((edit) => updatedEdit.id === edit.id);
  if (!previousEdit) {
    throw new Error(`Edit with id ${updatedEdit.id} can not be found`);
  }

  // Remove indexes by both: previous and updated edits.
  removeAffectedIndex(previousEdit);
  removeAffectedIndex(updatedEdit);

  // Replace previousEdit with updatedEdit.
  workerState.edits = workerState.edits?.map((edit) =>
    edit.id === updatedEdit.id ? updatedEdit : edit
  );
}

export type UpdateEditFn = typeof updateEdit;

type ComputeOverridesOptions = {
  force?: boolean;
};

function computeVariantOverridesTable(): Table {
  assertInitialised(workerState);

  const sideBuilder = new DictionaryBuilder({
    type: new Dictionary(new Utf8(), new Int8()),
  });

  const srcRegionBuilder = new DictionaryBuilder({
    type: new Dictionary(new Utf8(), new Int16()),
  });

  // ! M-type dictionary is currently using an Int8 index, so max supported number of m-types is 128.
  const srcMtypeBuilder = new DictionaryBuilder({
    type: new Dictionary(new Utf8(), new Int8()),
  });

  const dstRegionBuilder = new DictionaryBuilder({
    type: new Dictionary(new Utf8(), new Int16()),
  });

  const dstMtypeBuilder = new DictionaryBuilder({
    type: new Dictionary(new Utf8(), new Int8()),
  });

  const variantBuilder = new DictionaryBuilder({
    type: new Dictionary(new Utf8(), new Int8()),
  });

  // Skip sides where there is no applicable edits
  const hemisphereDirectionsAffectedByEdits = HEMISPHERE_DIRECTIONS.filter(
    (hemisphereDirection) =>
      workerState.edits.filter((edit) => isEditApplicable('variant', hemisphereDirection, edit))
        .length > 0
  );

  hemisphereDirectionsAffectedByEdits.forEach((hemisphereDirection) => {
    if (!workerState.variantIndex[hemisphereDirection]) {
      buildVariantIndex(hemisphereDirection);
    }

    const variantNames = ['disabled', ...Object.keys(workerState.config?.variants).sort()];

    const variantIdxByName = Object.keys(workerState.config?.variants)
      .sort()
      .reduce((map, variantName, idx) => map.set(variantName, idx + 1), new Map());

    const initialTable = workerState.tables.variant.initial;

    const hemisphereVariantDiffIndex = workerState.variantIndex[
      hemisphereDirection
    ] as BrainRegionLevelMap<number>;
    workerState.variantIndex[hemisphereDirection] = undefined;

    // First stage

    const applyEntry = (entry: any) => {
      const brainRegionKey = createKey(entry.source_region, entry.target_region);

      const mtypeKey = createKey(entry.source_mtype, entry.target_mtype);

      const variantIdx = variantIdxByName.get(entry.variant);

      const mtypeLevelMap = hemisphereVariantDiffIndex.get(brainRegionKey);

      if (!mtypeLevelMap) return;

      if (mtypeLevelMap.size === 0) {
        hemisphereVariantDiffIndex.delete(brainRegionKey);
      }

      const currentVariantIdx = mtypeLevelMap.get(mtypeKey);
      if (currentVariantIdx === undefined) return;

      if (currentVariantIdx !== variantIdx) {
        sideBuilder.append(hemisphereDirection);
        srcRegionBuilder.append(entry.source_region);
        srcMtypeBuilder.append(entry.source_mtype);
        dstRegionBuilder.append(entry.target_region);
        dstMtypeBuilder.append(entry.target_mtype);
        variantBuilder.append(variantNames[currentVariantIdx]);
      }

      mtypeLevelMap.delete(mtypeKey);
    };

    // TODO Is it worth to have a separate function here?
    const applyTable = (table: Table) => {
      const { numRows } = table;
      const batch = table.batches[0];
      const sideColIdx = table.schema.fields.findIndex((field) => field.name === 'side');
      const sideVec = batch.getChildAt(sideColIdx);

      if (!sideVec) {
        throw new Error('Can not get Vector for .side property');
      }

      for (let i = 0; i < numRows; i += 1) {
        if (sideVec.get(i) === hemisphereDirection) {
          applyEntry(batch.get(i));
        }
      }
    };

    applyTable(initialTable);

    // Second stage

    for (const [brainRegionKey, mtypeLevelMap] of hemisphereVariantDiffIndex.entries()) {
      for (const [mtypeKey, variantIndex] of mtypeLevelMap.entries()) {
        const [srcBrainRegion, dstBrainRegion] = parseKey(brainRegionKey);
        const [srcMtype, dstMtype] = parseKey(mtypeKey);

        sideBuilder.append(hemisphereDirection);
        srcRegionBuilder.append(srcBrainRegion);
        srcMtypeBuilder.append(srcMtype);
        dstRegionBuilder.append(dstBrainRegion);
        dstMtypeBuilder.append(dstMtype);
        variantBuilder.append(variantNames[variantIndex]);
      }
    }
  });

  const sideVector = sideBuilder.finish().toVector();
  const srcRegionVector = srcRegionBuilder.finish().toVector();
  const srcMtypeVector = srcMtypeBuilder.finish().toVector();
  const dstRegionVector = dstRegionBuilder.finish().toVector();
  const dstMtypeVector = dstMtypeBuilder.finish().toVector();
  const variantVector = variantBuilder.finish().toVector();

  const variantOverridesTable = new Table({
    side: sideVector,
    source_region: srcRegionVector,
    source_mtype: srcMtypeVector,
    target_region: dstRegionVector,
    target_mtype: dstMtypeVector,
    variant: variantVector,
  });

  return variantOverridesTable;
}

function computeParamOverridesTable(variantName: string): Table {
  assertInitialised(workerState);

  const paramNames = Object.keys(workerState.config.variants[variantName].params).sort();

  const sideBuilder = new DictionaryBuilder({
    type: new Dictionary(new Utf8(), new Int8()),
  });

  const srcRegionBuilder = new DictionaryBuilder({
    type: new Dictionary(new Utf8(), new Int16()),
  });

  // ! M-type dictionary is currently using an Int8 index, so max supported number of m-types is 128.
  const srcMtypeBuilder = new DictionaryBuilder({
    type: new Dictionary(new Utf8(), new Int8()),
  });

  const dstRegionBuilder = new DictionaryBuilder({
    type: new Dictionary(new Utf8(), new Int16()),
  });

  const dstMtypeBuilder = new DictionaryBuilder({
    type: new Dictionary(new Utf8(), new Int8()),
  });

  const paramBuilders = paramNames.map(() => new Float64Builder({ type: new Float64() }));

  // Skip sides where there is no applicable edits
  const hemisphereDirectionsAffectedByEdits = HEMISPHERE_DIRECTIONS.filter(
    (hemisphereDirection) =>
      workerState.edits.filter((edit) => isEditApplicable('param', hemisphereDirection, edit))
        .length > 0
  );

  hemisphereDirectionsAffectedByEdits.forEach((hemisphereDirection) => {
    buildParamIndex(hemisphereDirection, variantName);

    const initialTable = workerState.tables.params.initial[variantName];

    const hemisphereParamDiffIndex = workerState.paramIndex[variantName][hemisphereDirection];
    if (!hemisphereParamDiffIndex) {
      throw new Error('No param index available for despite marked as such');
    }
    workerState.paramIndex[variantName][hemisphereDirection] = undefined;
    paramNames.forEach((paramName) =>
      workerState.paramIndexAvailability.set(
        createKey(hemisphereDirection, variantName, paramName),
        false
      )
    );

    // First stage

    const applyEntry = (entry: any) => {
      const brainRegionKey = createKey(entry.source_region, entry.target_region);

      const mtypeKey = createKey(entry.source_mtype, entry.target_mtype);

      const mtypeLevelMap = hemisphereParamDiffIndex.get(brainRegionKey);

      if (!mtypeLevelMap) return;

      if (mtypeLevelMap.size === 0) {
        hemisphereParamDiffIndex.delete(brainRegionKey);
      }

      const paramValues = mtypeLevelMap.get(mtypeKey);
      if (paramValues === undefined) return;

      const notEqual = paramNames.some(
        (paramName, paramIdx) => paramValues[paramIdx] !== entry[paramName]
      );

      if (notEqual) {
        sideBuilder.append(hemisphereDirection);
        srcRegionBuilder.append(entry.source_region);
        srcMtypeBuilder.append(entry.source_mtype);
        dstRegionBuilder.append(entry.target_region);
        dstMtypeBuilder.append(entry.target_mtype);

        paramNames.forEach((paramName, idx) => paramBuilders[idx].append(paramValues[idx]));
      }

      mtypeLevelMap.delete(mtypeKey);
    };

    // TODO Is it worth to have a separate function here?
    const applyTable = (table: Table) => {
      const { numRows } = table;
      const batch = table.batches[0];
      const sideColIdx = table.schema.fields.findIndex((field) => field.name === 'side');
      const sideVec = batch.getChildAt(sideColIdx);

      if (!sideVec) {
        throw new Error('Can not get Vector for .side property');
      }

      for (let i = 0; i < numRows; i += 1) {
        if (sideVec.get(i) === hemisphereDirection) {
          applyEntry(batch.get(i));
        }
      }
    };

    applyTable(initialTable);

    // Second stage

    for (const [brainRegionKey, mtypeLevelMap] of hemisphereParamDiffIndex.entries()) {
      for (const [mtypeKey, paramValues] of mtypeLevelMap.entries()) {
        const [srcBrainRegion, dstBrainRegion] = parseKey(brainRegionKey);
        const [srcMtype, dstMtype] = parseKey(mtypeKey);

        sideBuilder.append(hemisphereDirection);
        srcRegionBuilder.append(srcBrainRegion);
        srcMtypeBuilder.append(srcMtype);
        dstRegionBuilder.append(dstBrainRegion);
        dstMtypeBuilder.append(dstMtype);

        paramNames.forEach((paramName, idx) => paramBuilders[idx].append(paramValues[idx]));
      }
    }
  });

  const sideVector = sideBuilder.finish().toVector();
  const srcRegionVector = srcRegionBuilder.finish().toVector();
  const srcMtypeVector = srcMtypeBuilder.finish().toVector();
  const dstRegionVector = dstRegionBuilder.finish().toVector();
  const dstMtypeVector = dstMtypeBuilder.finish().toVector();

  const paramValueVectors = paramBuilders.map((paramBuilder) => paramBuilder.toVector());
  const paramValueVectorObj = paramNames.reduce(
    (obj, paramName, idx) => ({ ...obj, [paramName]: paramValueVectors[idx] }),
    {}
  );

  const paramOverridesTable = new Table({
    side: sideVector,
    source_region: srcRegionVector,
    source_mtype: srcMtypeVector,
    target_region: dstRegionVector,
    target_mtype: dstMtypeVector,
    ...paramValueVectorObj,
  });

  return paramOverridesTable;
}

type Overrides = {
  variant: Table;
  params: Map<string, Table>;
};

/**
 * The overrides are computed in two stages.
 *
 * During the first stage worker reads records from the arrow table and compares values
 * with what's stored in the diff index.
 * If the value is the same - it's deleted from the diff index,
 * if different - the overrides table is extended with it.
 * After the execution overrides table contains records for pathways
 * that were originally present in the initial table.
 *
 * The second stage iterates over what's left from the diff index,
 * which now contains only records for pathways not present in the
 * initial table, and adds those records to the overrides table.
 */
async function computeOverrides(options?: ComputeOverridesOptions): Promise<Overrides | undefined> {
  assertInitialised(workerState);

  const variantNames = Object.keys(workerState.config.variants).sort();

  const configEdits = workerState.config._ui_data?.editHistory?.map((serialisibleEdit) =>
    fromSerialisibleEdit(serialisibleEdit)
  );

  if (isEqual(workerState.edits, configEdits) && !options?.force) return;

  const variantOverridesTable = computeVariantOverridesTable();
  const paramOverridesTableMap = variantNames.reduce(
    (map, variantName) => map.set(variantName, computeParamOverridesTable(variantName)),
    new Map()
  );

  return {
    variant: variantOverridesTable,
    params: paramOverridesTableMap,
  };
}

export type ComputeOverridesFn = typeof computeOverrides;

function setOverrides(overrides: Overrides): void {
  assertInitialised(workerState);

  workerState.tables.variant.overrides = overrides.variant;

  const variantNames = Object.keys(workerState.config.variants).sort();

  variantNames.forEach((variantName) => {
    const paramOverridesTable = overrides.params.get(variantName);

    if (!paramOverridesTable) {
      throw new Error(`Missing variant param table for ${variantName}`);
    }

    workerState.tables.params.overrides[variantName] = paramOverridesTable;
  });
}

async function persistOverrides(overrides: Overrides): Promise<Map<string, number>> {
  assertInitialised(workerState);

  const variantNames = Object.keys(workerState.config.variants).sort();

  const variantOverridesBuffer = tableToIPC(overrides.variant, 'file').buffer;

  const paramOverridesBuffers = variantNames.map((variantName) => {
    const variantParamsOverridesTable = overrides.params.get(variantName);

    if (!variantParamsOverridesTable) {
      throw new Error(`Missing variant param table for ${variantName}`);
    }

    return tableToIPC(variantParamsOverridesTable, 'file').buffer;
  });

  // TODO Use compression when the support for gzipped arrow files arrives to the workflow.
  // const compressedVariantOverridesStream = compress(new Blob([variantOverridesBuffer]).stream());
  // const compressedParamOverridesStreams = variantNames.map((variantName, idx) =>
  //   compress(new Blob([paramOverridesBuffers[idx]]).stream())
  // );

  // const compressedVariantOverridesBuffer = await new Response(
  //   compressedVariantOverridesStream
  // ).arrayBuffer();
  // const compressedParamOverridesBuffers = await Promise.all(
  //   variantNames.map((variantName, idx) =>
  //     new Response(compressedParamOverridesStreams[idx]).arrayBuffer()
  //   )
  // );

  const { config, edits, session } = workerState;

  /**
   * Fetching latest versions of entities containing distributions with arrow files
   * to extract next rev for the update.
   */
  const overridesResources = await Promise.all([
    fetchResourceById<MicroConnectomeVariantSelectionOverridesResource>(
      config.overrides.variants.id,
      session
    ),
    ...variantNames.map((variantName) =>
      fetchResourceById<MicroConnectomeDataOverridesResource>(
        config.overrides[variantName].id,
        session
      )
    ),
  ]);

  const overridesFilesLatestRevs = await Promise.all([
    fetchLatestRev(overridesResources[0].distribution.contentUrl, session),
    ...variantNames.map((variantName, idx) =>
      fetchLatestRev(overridesResources[idx + 1].distribution.contentUrl, session)
    ),
  ]);

  /**
   * Updating compressed arrow files.
   */
  const updatedOverridesFilesMeta = await Promise.all([
    updateFileByUrl(
      setRev(overridesResources[0].distribution.contentUrl, overridesFilesLatestRevs[0]),
      // TODO Use compression when the worflow supports that.
      // compressedVariantOverridesBuffer,
      // 'microconnectome-variant-overrides.arrow.gz',
      // 'application/gzip',
      variantOverridesBuffer,
      'microconnectome-variant-overrides.arrow',
      'application/arrow',
      session
    ),

    ...variantNames.map((variantName, idx) =>
      updateFileByUrl(
        setRev(
          overridesResources[idx + 1].distribution.contentUrl,
          overridesFilesLatestRevs[idx + 1]
        ),
        // TODO Use compression when the worflow supports that.
        // compressedParamOverridesBuffers[idx],
        // `microconnectome-${variantName}-data-overrides.arrow.gz`,
        // 'application/gzip',
        paramOverridesBuffers[idx],
        `microconnectome-${variantName}-data-overrides.arrow`,
        'application/arrow',
        session
      )
    ),
  ]);

  /**
   * Updating entities containing arrow files.
   */
  const updatedOverridesResources = await Promise.all(
    overridesResources
      .map((resource, idx) => ({
        ...resource,
        distribution: createDistribution(updatedOverridesFilesMeta[idx]),
      }))
      .map((updatedResource) => updateResource(updatedResource, session, undefined, false))
  );

  const variantResourceRev = updatedOverridesResources[0]._rev;
  const paramResourceRevs = updatedOverridesResources.slice(1).map((resource) => resource._rev);

  config.overrides.variants.rev = variantResourceRev;
  variantNames.forEach((variantName, idx) => {
    config.overrides[variantName].rev = paramResourceRevs[idx];
  });

  if (!config._ui_data) {
    config._ui_data = {};
  }

  config._ui_data.editHistory = edits.map((edit) => toSerialisibleEdit(edit));

  return variantNames.reduce(
    (map, variantName, idx) => map.set(variantName, paramResourceRevs[idx]),
    new Map().set('variant', variantResourceRev)
  );
}

export type SaveOverridesFn = typeof saveOverrides;

async function saveOverrides(): Promise<Map<string, number> | undefined> {
  const overrides = await computeOverrides();

  if (!overrides) return;

  setOverrides(overrides);
  const updatedRevMap = await persistOverrides(overrides);

  // TODO Seek for a better solution
  return updatedRevMap;
}

// TODO Investigate using a flat index

expose({
  init,
  createAggregatedVariantView,
  createAggregatedParamView,
  addEdit,
  removeEdit,
  updateEdit,
  saveOverrides,
});
