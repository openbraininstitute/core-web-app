import { SynaptomeProps } from '../../type/artifactsType';

const SYNAPTOME_CONTENT: SynaptomeProps[] = [
  {
    name: 'Example Synaptome',
    description: 'A synaptome example for demonstration purposes.',
    MEModel: 'MEModel_1',
    MType: 'CP_FS',
    EType: 'cNAD_lts_dSTR',
    brainRegion: 'Frontal Cortex',
    species: 'Mus musculus',
    createdBy: 'Researcher A',
    creationDate: '2023-01-01',
    download:
      '/public-projects/synaptome=Example_Synaptome__mtype=CP_FS__etype=cNAD_lts_dSTR__species=mouse__brain_region=CP__thumbnail.png',
  },
  {
    name: 'Synaptome 2',
    description: 'A second synaptome example for testing.',
    MEModel: 'MEModel_2',
    MType: 'DBC_FS',
    EType: 'cNAD_lts_dSTR',
    brainRegion: 'Hippocampus',
    species: 'Rattus norvegicus',
    createdBy: 'Researcher B',
    creationDate: '2023-02-01',
    download:
      '/public-projects/synaptome=Synaptome_2__mtype=DBC_FS__etype=cNAD_lts_dSTR__species=rat__brain_region=Hippocampus__thumbnail.png',
  },
  {
    name: 'Synaptome 3',
    description: 'A third synaptome example for validation.',
    MEModel: 'MEModel_3',
    MType: 'DBC_FS',
    EType: 'cNAD_lts_dSTR',
    brainRegion: 'Cerebellum',
    species: 'Mus musculus',
    createdBy: 'Researcher C',
    creationDate: '2023-03-01',
    download:
      '/public-projects/synaptome=Synaptome_3__mtype=DBC_FS__etype=cNAD_lts_dSTR__species=mouse__brain_region=Cerebellum__thumbnail.png',
  },
];

export default SYNAPTOME_CONTENT;
