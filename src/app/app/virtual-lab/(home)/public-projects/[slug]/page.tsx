import PublicProjectMain from '@/components/PublicProjects/PublicProjectMain';

export type ParamProps = {
  params: {
    slug: string;
  };
};

export default async function SinglePublicProjectPage({ params }: ParamProps) {
  const { slug } = params;

  return <PublicProjectMain slug={slug} />;
}
