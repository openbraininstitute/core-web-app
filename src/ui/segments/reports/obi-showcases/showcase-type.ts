import type { PortableTextBlock } from 'next-sanity';

export type EModelsProps = {
  name: string;
  response: string;
  brainRegion: string;
  mType: string | null;
  modelCumulatedScore: number;
  species: string;
  contributors: string | null;
  creationDate: string | null;
  download: string | null;
  downloadLink: string | null;
};

export type MEModelsProps = {
  name: string;
  morphologyThumbnail: string | null;
  traceThumbnail: string | null;
  validated: boolean;
  brainRegion: string;
  mType: string;
  eType: string;
  species: string;
  createdBy: string;
  creationDate: string | null;
  download: string | null;
  downloadLink: string | null;
};

export type SynaptomeProps = {
  name: string;
  description: string;
  MEModel: string;
  MType: string | null;
  EType: string | null;
  brainRegion: string;
  species: string;
  createdBy: string;
  creationDate: string;
  download: string;
};

type TimestampProps = {
  timestamp: number;
  label: string;
  description: string;
};

export type PresentationVideoProps = {
  url: string;
  title: string;
  alt: string;
  hasCaption: boolean;
  caption: string;
  useTimeStamps: boolean;
  timeStamps: TimestampProps[];
  hasCaptionTrack: boolean;
  captionTrack: string;
};

type AuthorListProps = {
  firstName: string;
  lastName: string;
  email: string;
  institution: string;
};

export type LinkAndDownloadArtifactProps = {
  title: string;
  description: string;
  url: string;
  file: string;
  _type: string;
};

type MinimalMeModelProps = {
  name: string;
  brainRegion: string;
  mType: string;
  eType: string;
  species: string;
};

export type NotebooksProps = {
  name: string;
  description: string;
  objectOfInterest: string;
  scale: string;
  authors: string;
  creationDate: string;
  readMe: PortableTextBlock[];
  url: string;
};

export type ShowCaseProjectQueryType = {
  name: string;
  slug: string;
  introduction: string;
  heroImage: string;
  authorsList: AuthorListProps[];
  description: PortableTextBlock[];
  videosList: PresentationVideoProps[];
  artifactType: string[];
  artifact: LinkAndDownloadArtifactProps[];
  meModelsList: MEModelsProps[];
  eModelTable: EModelsProps[];
  notebook: NotebooksProps[];
  minimalMeModel: MinimalMeModelProps[];
  eModelsTable: EModelsProps[];
  meModelTable: MEModelsProps[];
  synaptomeTable: SynaptomeProps[];
  _updatedAt: string;
};

export type HeaderPublicProjectProps = {
  title: string;
  headerImage: string;
};

export type Sections = 'description' | 'notebooks' | 'artifacts';
