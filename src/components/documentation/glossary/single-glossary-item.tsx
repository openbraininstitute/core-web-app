import { ContentForGlossaryItem } from '../hooks/use-sanity-content-for-glossary';

export default function SingleGlossaryItem({ content }: { content: ContentForGlossaryItem }) {
  return <div className="flex flex-col gap-y-4">Hello {content.Name}!</div>;
}
