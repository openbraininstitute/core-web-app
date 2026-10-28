import { Google_Sans_Flex } from 'next/font/google';

import HomePage from '@/ui/segments/landing/homepage';
import { generateMetadataFromSanity } from '@/ui/segments/landing/metadata/metadata';

import type { Metadata } from 'next';

const headlineFont = Google_Sans_Flex({
  weight: 'variable',
  subsets: ['latin'],
  axes: ['opsz'],
  display: 'swap',
  variable: '--font-homepage-headline',
});

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
    <div className={headlineFont.variable}>
      <HomePage
        error={{
          errorcode: searchParams.errorcode,
          originalCode: searchParams.original_code,
          description: searchParams.description,
        }}
      />
    </div>
  );
}
