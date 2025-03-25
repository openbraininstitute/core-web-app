export type PTGlossaryProps = {
  term: string;
  definition: string;
};

export type PTGlossaryListProps = {
  title: string;
  glossaryItems: PTGlossaryProps[];
};

export function SingleDefinition({ content, index }: { content: PTGlossaryProps; index: number }) {
  return (
    <div className="flex w-full flex-col">
      {index !== 0 && <div className="my-4 block h-px w-full bg-neutral-2" />}
      <div className="relative flex w-full flex-row flex-nowrap gap-x-4 text-[18px]">
        <div className="w-44 font-bold">{content.term}</div>

        <p className="font-light">{content.definition}</p>
      </div>
    </div>
  );
}

export default function PTGlossary({ content }: { content: PTGlossaryListProps }) {
  return (
    <div className="relative my-20 flex w-full flex-col">
      {content.title && (
        <div className="mb-8 text-lg font-semibold uppercase tracking-wide text-neutral-3">
          {content.title}
        </div>
      )}
      <div className="flex flex-col">
        {content.glossaryItems.map((item: PTGlossaryProps, index: number) => (
          <SingleDefinition key={`Glossary item ${item.term}`} content={item} index={index} />
        ))}
      </div>
    </div>
  );
}
