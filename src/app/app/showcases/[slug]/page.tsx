import ShowcasesSideNav from '@/components/Buttons/ShowcasesSideNav';
import ShowcaseMain from '@/components/PublicProjects/ShowcaseMain';

export type ParamProps = {
  params: {
    slug: string;
  };
};

export default async function Showcase({ params }: ParamProps) {
  const { slug } = params;

  return (
    <>
      <ShowcasesSideNav />
      <ShowcaseMain slug={slug} />
    </>
  );
}
