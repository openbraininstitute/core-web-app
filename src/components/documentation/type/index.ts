type PortableTextMark = {
  _key: string;
  _type: string;
  [key: string]: any;
};

type PortableTextChild = {
  _type: 'span' | string;
  _key: string;
  text?: string;
  marks?: string[];
  [key: string]: any;
};

type PortableTextBlock = {
  _type: string;
  _key: string;
  style?: string;
  children?: PortableTextChild[];
  markDefs?: PortableTextMark[];
  level?: number;
  listItem?: string;
  [key: string]: any;
};

type PortableText = PortableTextBlock[];

export type SingleSectionProps = {
  name: string;
  slug: string;
  children: SingleSectionProps[] | null;
  disabled: boolean;
  link: string;
};

export type StepProps = {
  title: string;
  content: PortableText | null;
  time: number | null;
};

export type SingleTutorialProps = {
  _id: string;
  title: string;
  slug: string;
  description: string;
  url: string;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
  content: PortableText | null;
  videoUrl: string;
  transcript: PortableText | null;
  steps: StepProps[] | null | undefined;
};

export type SingleGuideProps = {
  title: string;
  slug: string;
  description: string;
  content: PortableText | null;
  objectOfInterest: string;
  scale: string | null;
};

export type SingleWorkshopProps = {
  title: string;
  slug: string;
  description: string;
  date: string;
  content: PortableText | null;
};

export type AITooslsProps = {
  name: string;
  name_frontend: string;
  description: string;
  description_frontend: string;
  input_schema: string;
  hil: boolean;
  is_online: boolean;
};
