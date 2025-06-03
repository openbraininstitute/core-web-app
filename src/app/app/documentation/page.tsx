import DocumentationSideBloc from '@/components/documentation/global/SideBloc';

export default function DocumentationPage() {
  return (
    <div className="relative min-h-screen w-screen bg-primary-9 p-5">
      <DocumentationSideBloc />
      <main className="ml-[255px] w-2/3">
        <h1 className="text-3xl font-bold text-white">Documentation</h1>
      </main>
    </div>
  );
}
