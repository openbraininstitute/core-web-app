import { PortableTextBlock } from 'next-sanity';

export type ShowcaseAuthorType = {
  _key: string;
  firstName: string;
  lastName: string;
  email: string;
  institution: string;
};

export type EModelTableType = {
  _key: string;
  brainRegion: string;
  contributors: string;
  creationDate: string;
  downloadLink: string;
  eType: string;
  mType: string;
  modelCumulatedScore: number;
  morphology: string;
  name: string;
  response: string;
  species: string;
};

export type EModelListType = {
  _key: string;
  brainRegion: string;
  contributors: string;
  creationDate: string;
  eType: string;
  mType: string;
  hasMorphologyThumbnail: boolean;
  hasResponseThumbnail: boolean;
  modelCumulatedScore: number;
  morphology: string;
  name: string;
  species: string;
  validated: boolean;
};

export type MeModelTableType = {
  _key: string;
  _type: string;
  brainRegion: string;
  createdBy: string;
  creationDate: string;
  download: string;
  eType: string;
  mType: string;
  morphologyThumbnail: string;
  name: string;
  species: string;
  traceThumbnail: string;
  validated: boolean;
};

export type MeModelListType = {
  _key: string;
  _type: string;
  brainRegion: string;
  eType: string;
  file: string;
  hasMorphologyThumbnail: boolean;
  hasTraceThumbnail: boolean;
  mType: string;
  morphologyId: string;
  name: string;
  species: string;
  trace: string;
  traceFileId: string;
  validated: boolean;
};

export type MinimalMeModelType = {
  _key: string;
  brainRegion: string;
  eType: string;
  mType: string;
  name: string;
  species: string;
};

export type NotebookType = {
  _key: string;
  _type: string;
  authors: string;
  creationDate: string;
  description: string;
  name: string;
  objectOfInterest: string;
  readMe: PortableTextBlock[];
  scale: string;
  url: string;
};

export type SynaptomeTableType = {
  EType: string;
  MEModel: string;
  MType: string;
  _key: string;
  _type: string;
  brainRegion: string;
  createdBy: string;
  creationDate: string;
  description: string;
  download: string;
  name: string;
  species: string;
};

export type VideosListType = {
  _key: string;
  _type: string;
  alt: string;
  hasCaption: boolean;
  title: string;
  url: string;
  useTimestamps: boolean;
};

export type OBIShowcaseType = {
  _id: string;
  name: string;
  slug: string;
  introduction: string;
  artifactType: string[];
  authorsList: ShowcaseAuthorType[];
  description: PortableTextBlock[];
  eModelTable: EModelTableType[];
  eModelsList: EModelListType[];
  heroImage: string;
  meModelTable: MeModelTableType[];
  meModelsList: MeModelListType[];
  minimalMeModel: MinimalMeModelType[];
  notebook: NotebookType[];
  synaptomeTable: SynaptomeTableType[];
  videosList: VideosListType[];
};
