import { PortableTextBlock } from 'next-sanity';
import { EModelsProps, MEModelsProps, SynaptomeProps } from './artifactsType';

export type { MEModelsProps } from './artifactsType';

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
  _id: string;
  eModelsList: any;
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
