import { PortableTextBlock } from 'next-sanity';

export type TimestampProps = {
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
  file: string;
  name: string;
  species: string;
  brainRegion: string;
  validated: boolean;
  mType: string;
  eType: string;
  morphologyId: string;
  hasMorphologyThumbnail: boolean;
  morphology: string;
  traceFileId: string;
  hasTraceThumbnail: boolean;
  trace: string;
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
  videosList: PresentationVideoProps[];
  artifactType: string;
  artifact: LinkAndDownloadArtifactProps[];
  meModelsList: MEModelsProps[];
  eModelsList: EModelsProps[];
  notebook: NotebooksProps[];
  _updatedAt: string;
};
