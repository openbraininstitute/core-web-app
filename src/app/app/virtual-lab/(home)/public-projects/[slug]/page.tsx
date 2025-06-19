import PublicProjectMain from '@/components/PublicProjects/PublicProjectMain';

export type ParamProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function SinglePublicProjectPage({ params: promisedParams }: ParamProps) {
  const params = await promisedParams;
  const { slug } = params;

  return <PublicProjectMain slug={slug} />;
}
