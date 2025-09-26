import { tryType } from '@/components/LandingPage/content';

export type AuthorListProps = {
  firstName: string;
  lastName: string;
  email: string;
  institution: string;
};

export type OBIShowcaseProjectType = {
  name: string;
  slug: string;
  introduction: string;
  heroImage: string;
  authorsList: AuthorListProps[];
  _updatedAt: string;
};

export const isOBIShowcaseProjectProps = (data: unknown): data is OBIShowcaseProjectType[] => {
  return tryType('OBIShowcaseProjectProps', data, [
    'array',
    {
      name: 'string',
      slug: 'string',
      introduction: 'string',
      heroImage: 'string',
      authorsList: [
        'array',
        {
          firstName: 'string',
          lastName: 'string',
          email: 'string',
          institution: 'string',
        },
      ],
      _updatedAt: 'string',
    },
  ]);
};
