import CellTypeDefinitionsFullList from '@/components/documentation/glossary/cell-types';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Glossary cell types definitions',
  description: 'Explore the glossary cell types definitions in our documentation.',
};

export default function Page() {
  return <CellTypeDefinitionsFullList />;
}
