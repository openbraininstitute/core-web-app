import Entrypoint from '@/components/Entrypoint';

export default function DevPage({
  searchParams,
}: {
  searchParams: { errorcode: string | undefined };
}) {
  return <Entrypoint errorCode={searchParams.errorcode} devEntry />;
}
