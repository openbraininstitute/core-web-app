import { PortableTextBlock } from 'next-sanity';

export type PresentationVideoProps = {
  url: string;
  alt: string;
  hasCaption: boolean;
  useTimeStamps: boolean;
};

export type AuthorListProps = {
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

export type MEModelsProps = {
  name: string;
  morphology: string;
  trace: string;
  validated: boolean;
  brainRegion: string;
  mType: string;
  eType: string;
  url: string;
  _type: string;
};

export type EModelsProps = {
  name: string;
  response: string;
  brainRegion: string;
  mType: string;
  eType: string;
  modelCumulatedScore: number;
  _type: string;
};

export type NotebooksProps = {
  name: string;
  url: string;
  readMe: PortableTextBlock[];
};

export type ShowCaseProjectQueryType = {
  name: string;
  slug: string;
  introduction: string;
  heroImage: string;
  authorsList: AuthorListProps[];
  description: PortableTextBlock[];
  presentationVideo: PresentationVideoProps;
  captionTrack: string;
  artifactType: string;
  artifact: LinkAndDownloadArtifactProps[];
  meModelsList: MEModelsProps[];
  eModelsList: EModelsProps[];
  notebook: NotebooksProps[];
  _updatedAt: string;
};
