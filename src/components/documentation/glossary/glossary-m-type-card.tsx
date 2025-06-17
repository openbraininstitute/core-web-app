import { CellTypeProps } from '@/components/explore-section/Circuit/type';

export default function GlossaryMTypeCard({ content }: { content: CellTypeProps }) {
  return (
    <div className="w-full text-white">
      <h4 className="text-2xl font-bold">{content.pref_label}</h4>
      <div className="bg-primary-4 my-3 h-px w-8" />
      <p className="text-primary-1 mt-2 text-lg leading-normal">{content.definition}</p>
    </div>
  );
}
