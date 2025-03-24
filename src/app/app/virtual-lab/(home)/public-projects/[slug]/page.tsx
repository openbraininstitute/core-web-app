import PublicProjectSideNavigation from '@/components/Buttons/PublicProjectSideNavigation';
import PublicProjectMain from '@/components/PublicProjects/PublicProjectMain';

export type ParamProps = {
  params: {
    slug: string;
  };
};

export default async function SinglePublicProjectPage({ params }: ParamProps) {
  const { slug } = params;

  return (
    <>
      {/* <PublicProjectSideNavigation /> */}
      <PublicProjectMain slug={slug} />
    </>
  );
}
