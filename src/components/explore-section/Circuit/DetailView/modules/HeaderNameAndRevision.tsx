import { CircuitSchemaProps } from '../../content/CIRCUITS_PLACEHOLDER';

import { ChevronRight } from '@/components/icons';

export default function HeaderNameAndRevision({ content }: { content: CircuitSchemaProps }) {
  return (
    <div className="relative flex flex-row items-start">
      <div className="relative mr-8 flex flex-col">
        <div className="text-sm font-light uppercase text-neutral-5">Name</div>
        <h1 className="text-3xl font-bold text-primary-8">{content.name}</h1>
      </div>

      <button
        type="button"
        aria-label="Toggle circuit revision"
        className="relative top-2.5 flex h-10 w-36 flex-row items-center justify-between border border-solid border-primary-8 px-4"
      >
        <span className="block text-base text-primary-9">Revision {content.metadata.revision}</span>

        <ChevronRight fill="#003A8C" className="h-3 w-auto" />
      </button>
    </div>
  );
}
