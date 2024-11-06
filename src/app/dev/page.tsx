import Entrypoint from '@/components/Entrypoint';
import { basePath } from '@/config';

export default function DevPage({
  searchParams,
}: {
  searchParams: { errorcode: string | undefined };
}) {
  return <Entrypoint errorCode={searchParams.errorcode} callbackUrl={`${basePath}/virtual-lab`} />;
}
