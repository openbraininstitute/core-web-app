import DocumentationSideBloc from '@/components/documentation/global/side-bloc';

export default function DocumentationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-screen bg-primary-9 p-8">
      <DocumentationSideBloc />
      <main className="ml-[255px] w-2/3">{children}</main>
    </div>
  );
}
