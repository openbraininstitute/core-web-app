import isEqual from "es-toolkit/compat/isEqual";
import { type Atom, atom } from "jotai";
import { atomFamily } from "jotai-family";
import { arrayToTree } from "performant-array-to-tree";
import { getEtypes } from "@/api/entitycore/queries/annotations/etype";
import { getMtypes } from "@/api/entitycore/queries/annotations/mtype";
import { downloadAsset } from "@/api/entitycore/queries/assets";
import { getCellCompositions } from "@/api/entitycore/queries/general/cell-composition";
import { EntityTypeDict } from "@/api/entitycore/types";
import type { ICellCompositionRoot } from "@/api/entitycore/types/entities/cell-composition";
import type { IAnnotation } from "@/api/entitycore/types/shared/global";
import { AssetLabel } from "@/api/entitycore/types/shared/global";
import { getAssetElement } from "@/api/entitycore/utils";
import { tryCatch } from "@/api/utils";
import { renameKeyDeep } from "@/components/tree/elements/helpers";
import { brainRegionAtlasAtom } from "@/features/brain-atlas-viewer/context";
import { PrimaryAnatomicalDivisionsHierarchyAtom } from "@/features/brain-region-hierarchy/context";
import { resolveBrainRegionCellComposition } from "@/features/cell-composition/composition-constructor";
import type { WorkspaceContext } from "@/types/common";
import { log } from "@/utils/logger";

const defaultCellCompositionName = "Cell Composition from Blue Brain Atlas";

const cellCompositionSummaryAtom = atom(
  async (): Promise<ICellCompositionRoot> => {
    const { data: cellComposition, error } = await tryCatch(
      getCellCompositions({
        filters: { name: defaultCellCompositionName },
      }),
    );
    if (error) throw error;
    if (!cellComposition.data.length)
      throw Error(
        `No cell composition found for ${defaultCellCompositionName}`,
      );

    const summaryAsset = getAssetElement({
      assets: cellComposition.data.at(0)?.assets,
      filter(i) {
        return i.label === AssetLabel.cell_composition_summary;
      },
    });

    if (!summaryAsset)
      throw Error(`No summary asset found for ${defaultCellCompositionName}`);

    const { data: cellCompositionSummary, error: assetError } = await tryCatch(
      downloadAsset<ICellCompositionRoot>({
        entityType: EntityTypeDict.CellComposition,
        entityId: cellComposition.data.at(0)?.id!,
        id: summaryAsset.id,
      }),
    );
    if (assetError) throw assetError;
    return cellCompositionSummary;
  },
);

export const annotationTypesAtom = atomFamily<
  WorkspaceContext,
  Atom<Promise<Array<IAnnotation>>>
>((ctx: WorkspaceContext) => {
  const childAtom = atom(async () => {
    const [etypes, mtypes] = await Promise.all([
      getEtypes({ ctx, filters: { page: 1, page_size: 1000 } }),
      getMtypes({ ctx, filters: { page: 1, page_size: 1000 } }),
    ]);
    return [...etypes.data, ...mtypes.data];
  });

  childAtom.debugLabel = "annotation-types";
  return childAtom;
}, isEqual);

export const cellCompositionAtom = atomFamily(
  ({ brainRegionId }: { brainRegionId: string }) => {
    const childAtom = atom(async (get) => {
      try {
        const [cellComposition, brainRegions, brainRegionAtlas] =
          await Promise.all([
            get(cellCompositionSummaryAtom),
            get(PrimaryAnatomicalDivisionsHierarchyAtom),
            get(brainRegionAtlasAtom),
          ]);

        if (
          !cellComposition ||
          !brainRegions ||
          !brainRegionAtlas?.data?.data
        ) {
          log("warn", "Missing required data for composition", {
            hasCellComposition: !!cellComposition,
            hasBrainRegions: !!brainRegions,
            hasBrainRegionAtlas: !!brainRegionAtlas?.data?.data,
          });

          return {
            totalComposition: {
              neuron: { density: 0, count: 0 },
              glia: { density: 0, count: 0 },
            },
            neurons: [],
          };
        }

        const { nodes, totalComposition } = resolveBrainRegionCellComposition({
          brainRegionId,
          cellCompositionRoot: cellComposition,
          atlasRegions: brainRegionAtlas.data?.data,
          hierarchy: brainRegions,
        });

        const neurons = renameKeyDeep(
          arrayToTree(
            nodes.map(({ composition, label, ...node }) => ({
              ...node,
              density: composition.neuron.density,
              count: composition.neuron.count,
              title: label,
            })),
            {
              dataField: null,
              parentId: "parentId",
              childrenField: "children",
            },
          ),
          "title",
          "name",
        );

        return { totalComposition, neurons };
      } catch (error) {
        log("error", "Error in cellCompositionAtom:", error);
        return {
          totalComposition: {
            neuron: { density: 0, count: 0 },
            glia: { density: 0, count: 0 },
          },
          neurons: [],
        };
      }
    });

    childAtom.debugLabel = `cell-composition-${brainRegionId}`;
    return childAtom;
  },
);
