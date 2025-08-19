/* eslint-disable no-empty */
import {
  getElectricalCellRecording,
  getEModel,
  getExperimentalBoutonDensity,
  getExperimentalNeuronDensity,
  getExperimentalSynapsesPerConnection,
  getMEModel,
  getReconstructionMorphology,
} from '@/api/entitycore/queries';
import { getSingleNeuronSynaptome } from '@/api/entitycore/queries/model/single-neuron-synaptome';
import { EntityTypeDict, TEntityTypeDict } from '@/api/entitycore/types';
import { Metadata } from '@/features/entity-download/metadata';
import { FileEntry } from '@/features/entity-download/types';
import { createAssetFileEntry, createTemplateFileEntry } from '@/features/entity-download/utils';
import { WorkspaceContext } from '@/types/common';

const ASSETS_BASE_PATH = 'data';

// TODO: Add error reporting to Sentry.

type GetEntityFilesHandler = (
  entityIds: string[],
  ctx?: WorkspaceContext,
  abortSignal?: AbortSignal
) => AsyncGenerator<FileEntry>;

async function* getReconstructionMorphologyFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata();

  try {
    yield await createTemplateFileEntry(EntityTypeDict.ReconstructionMorphology);
  } catch {}

  for (const entityId of entityIds) {
    const morphology = await getReconstructionMorphology({
      id: entityId,
      context: ctx,
    });

    const idx = metadata.entriesCount;

    const dataPath = `${ASSETS_BASE_PATH}/${idx}`;
    metadata.add({ idx, data_path: dataPath, ...morphology });

    for await (const asset of morphology.assets) {
      const path = `${ASSETS_BASE_PATH}/${idx}/${asset.path}`;
      try {
        yield await createAssetFileEntry({ entity: morphology, asset, path, ctx });
      } catch (_error) {}
    }
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}

async function* getElectricalCellRecordingFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata();

  try {
    yield await createTemplateFileEntry(EntityTypeDict.ElectricalCellRecording);
  } catch {}

  for (const entityId of entityIds) {
    const trace = await getElectricalCellRecording({
      id: entityId,
      context: ctx,
    });

    const idx = metadata.entriesCount;

    const dataPath = `${ASSETS_BASE_PATH}/${idx}`;
    metadata.add({ idx, data_path: dataPath, ...trace });

    for await (const asset of trace.assets) {
      const path = `${ASSETS_BASE_PATH}/${idx}/${asset.path}`;
      try {
        yield await createAssetFileEntry({ entity: trace, asset, path, ctx });
      } catch (_error) {}
    }
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}

async function* getExperimentalNeuronDensityFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata();

  try {
    yield await createTemplateFileEntry(EntityTypeDict.ExperimentalNeuronDensity);
  } catch {}

  for (const entityId of entityIds) {
    const idx = metadata.entriesCount;
    const neuronDensity = await getExperimentalNeuronDensity({ id: entityId, context: ctx });
    metadata.add({ idx, ...neuronDensity });
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}

async function* getExperimentalBoutonDensityFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata();

  try {
    yield await createTemplateFileEntry(EntityTypeDict.ExperimentalBoutonDensity);
  } catch {}

  for (const entityId of entityIds) {
    const idx = metadata.entriesCount;
    const boutonDensity = await getExperimentalBoutonDensity({ id: entityId, context: ctx });
    metadata.add({ idx, ...boutonDensity });
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}

async function* getExperimentalSynapsesPerConnectionFiles(
  entityIds: string[],
  ctx?: WorkspaceContext
) {
  const metadata = new Metadata();

  try {
    yield await createTemplateFileEntry(EntityTypeDict.ExperimentalSynapsesPerConnection);
  } catch {}

  for (const entityId of entityIds) {
    const idx = metadata.entriesCount;
    const expSynapsesPerConnection = await getExperimentalSynapsesPerConnection({
      id: entityId,
      context: ctx,
    });

    metadata.add({ idx, ...expSynapsesPerConnection });
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}

async function* getEmodelFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata();

  try {
    yield await createTemplateFileEntry(EntityTypeDict.Emodel);
  } catch {}

  for (const entityId of entityIds) {
    const idx = metadata.entriesCount;
    const emodel = await getEModel({
      id: entityId,
      context: ctx,
    });

    metadata.add({ idx, ...emodel });

    // HOC file
    const hocFileAsset = emodel.assets.find((asset) => asset.label === 'neuron_hoc')!;

    try {
      const path = `${ASSETS_BASE_PATH}/${idx}/hoc/${hocFileAsset.path}`;
      yield await createAssetFileEntry({ entity: emodel, asset: hocFileAsset, path, ctx });
    } catch (_error) {}

    // Morphologies
    const exemplarMorphology = await getReconstructionMorphology({
      id: emodel.exemplar_morphology.id,
      context: ctx,
    });

    const morphAssets = exemplarMorphology.assets.filter((asset) => asset.label === 'morphology');

    for await (const asset of morphAssets) {
      const path = `${ASSETS_BASE_PATH}/${idx}/morphology/${asset.path}`;
      try {
        yield await createAssetFileEntry({ entity: exemplarMorphology, asset, path, ctx });
      } catch (_error) {}
    }

    // MOD files
    for await (const icEntity of emodel.ion_channel_models) {
      const modAsset = icEntity.assets.find((asset) => asset.label === 'neuron_mechanisms')!;
      const path = `${ASSETS_BASE_PATH}/${idx}/mechanisms/${modAsset.path}`;
      try {
        yield await createAssetFileEntry({ entity: icEntity, asset: modAsset, path, ctx });
      } catch (_error) {}
    }
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}

async function* getMEmodelFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata();

  try {
    yield await createTemplateFileEntry(EntityTypeDict.Memodel);
  } catch {}

  for (const entityId of entityIds) {
    const idx = metadata.entriesCount;
    const memodel = await getMEModel({
      id: entityId,
      context: ctx,
    });

    metadata.add({ idx, ...memodel });

    const emodel = await getEModel({
      id: memodel.emodel.id,
      context: ctx,
    });

    // HOC file
    const hocFileAsset = emodel.assets.find((asset) => asset.label === 'neuron_hoc')!;
    try {
      const path = `${ASSETS_BASE_PATH}/${idx}/hoc/${hocFileAsset.path}`;
      yield await createAssetFileEntry({ entity: emodel, asset: hocFileAsset, path, ctx });
    } catch (_error) {}

    // Morphologies
    const morphology = await getReconstructionMorphology({
      id: memodel.morphology.id,
      context: ctx,
    });

    const morphAssets = morphology.assets.filter((asset) => asset.label === 'morphology');

    for await (const asset of morphAssets) {
      const path = `${ASSETS_BASE_PATH}/${idx}/morphology/${asset.path}`;
      try {
        yield await createAssetFileEntry({ entity: morphology, asset, path, ctx });
      } catch (_error) {}
    }

    // MOD files
    for await (const icEntity of emodel.ion_channel_models) {
      const asset = icEntity.assets.find((a) => a.label === 'neuron_mechanisms')!;
      const path = `${ASSETS_BASE_PATH}/${idx}/mechanisms/${asset.path}`;
      try {
        yield await createAssetFileEntry({ entity: icEntity, asset, path, ctx });
      } catch (_error) {}
    }
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}

async function* getSingleNeuronSynaptomeFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata();

  try {
    yield await createTemplateFileEntry(EntityTypeDict.SingleNeuronSynaptome);
  } catch {}

  // TODO: add emodel assets when supported by the API
  for (const entityId of entityIds) {
    const idx = metadata.entriesCount;
    const singleNeuronSynaptomeModel = await getSingleNeuronSynaptome({
      id: entityId,
      context: ctx,
    });

    metadata.add({ idx, ...singleNeuronSynaptomeModel });

    // Synaptome config
    const synaptomeConfigAsset = singleNeuronSynaptomeModel.assets.find(
      (asset) => asset.label === 'single_neuron_synaptome_config'
    )!;
    try {
      const path = `${ASSETS_BASE_PATH}/${idx}/${synaptomeConfigAsset.path}`;
      yield await createAssetFileEntry({
        entity: singleNeuronSynaptomeModel,
        asset: synaptomeConfigAsset,
        path,
        ctx,
      });
    } catch (_error) {}

    const memodel = await getMEModel({
      id: singleNeuronSynaptomeModel.me_model.id,
      context: ctx,
    });

    const emodel = await getEModel({
      id: memodel.emodel.id,
      context: ctx,
    });

    // HOC file
    const hocFileAsset = emodel.assets.find((asset) => asset.label === 'neuron_hoc')!;
    try {
      const fileName = hocFileAsset.full_path.split('/').at(-1);
      const path = `${ASSETS_BASE_PATH}/${idx}/hoc/${fileName}`;
      yield await createAssetFileEntry({ entity: emodel, asset: hocFileAsset, path, ctx });
    } catch (_error) {}

    // Morphologies
    const morphology = await getReconstructionMorphology({
      id: memodel.morphology.id,
      context: ctx,
    });

    const morphAssets = morphology.assets.filter((asset) => asset.label === 'morphology');

    for await (const asset of morphAssets) {
      const path = `${ASSETS_BASE_PATH}/${idx}/morphology/${asset.path}`;
      try {
        yield await createAssetFileEntry({ entity: morphology, asset, path, ctx });
      } catch (_error) {}
    }

    // MOD files
    for await (const icEntity of emodel.ion_channel_models) {
      const asset = icEntity.assets.find((a) => a.label === 'neuron_mechanisms')!;
      const path = `${ASSETS_BASE_PATH}/${idx}/mechanisms/${asset.path}`;
      try {
        yield await createAssetFileEntry({ entity: icEntity, asset, path, ctx });
      } catch (_error) {}
    }
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}

export const getEntityFilesHandlerMap: Partial<Record<TEntityTypeDict, GetEntityFilesHandler>> = {
  // Experimental data
  [EntityTypeDict.ReconstructionMorphology]: getReconstructionMorphologyFiles,
  [EntityTypeDict.ElectricalCellRecording]: getElectricalCellRecordingFiles,
  [EntityTypeDict.ExperimentalNeuronDensity]: getExperimentalNeuronDensityFiles,
  [EntityTypeDict.ExperimentalBoutonDensity]: getExperimentalBoutonDensityFiles,
  [EntityTypeDict.ExperimentalSynapsesPerConnection]: getExperimentalSynapsesPerConnectionFiles,
  // Model data
  [EntityTypeDict.Emodel]: getEmodelFiles,
  [EntityTypeDict.Memodel]: getMEmodelFiles,
  [EntityTypeDict.SingleNeuronSynaptome]: getSingleNeuronSynaptomeFiles,
};
