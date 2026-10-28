import HomePage from '@/ui/segments/landing/homepage';
import { generateMetadataFromSanity } from '@/ui/segments/landing/metadata/metadata';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await generateMetadataFromSanity('/');
  return metadata;
}

export default async function RootPage({
  searchParams: promisedParams,
}: {
  searchParams: Promise<{
    errorcode: string | undefined;
    original_code: string | undefined;
    description: string | undefined;
  }>;
}) {
  const searchParams = await promisedParams;
  return (
    <HomePage
      error={{
        errorcode: searchParams.errorcode,
        originalCode: searchParams.original_code,
        description: searchParams.description,
      }}
    />
  );
}
