export type PublicationCardProps = {
  title: string;
  authors: string[];
  link: string;
  doi: {
    name: string;
    url: string;
  };
  institution?: string;
  publicationDate: string;
  abstract: string;
};
