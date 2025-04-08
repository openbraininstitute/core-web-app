import PublicProjectMain from '@/components/PublicProjects/PublicProjectMain';

export type ParamProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function SinglePublicProjectPage(props: ParamProps) {
  const params = await props.params;
  const { slug } = params;

  return <PublicProjectMain slug={slug} />;
}
