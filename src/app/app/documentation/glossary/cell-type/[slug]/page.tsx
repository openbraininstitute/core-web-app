import { Metadata } from 'next';

import CellTypeDefinitionsFullList from '@/components/documentation/glossary/cell-types';

export const metadata: Metadata = {
  title: 'Glossary cell types definitions',
  description: 'Explore the glossary cell types definitions in our documentation.',
};

export default function Page() {
  return <CellTypeDefinitionsFullList />;
}
