'use client';

import { useParams } from 'next/navigation';

export default function GlossarySingleDefinitionPage() {
  const { params } = useParams();

  return (
    <div className="flex w-full flex-col gap-y-6">
      <div className="text-2xl font-bold text-primary-3">Glossary: {params}</div>
      <div className="text-base text-gray-600">
        A glossary is a list of terms in a particular domain of knowledge, with the definitions for
        those terms. It is often found at the end of a book or document, providing explanations of
        specialized vocabulary.
      </div>
    </div>
  );
}
