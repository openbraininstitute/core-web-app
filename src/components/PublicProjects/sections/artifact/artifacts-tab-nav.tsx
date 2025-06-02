import { ArticfactTypeProps } from '../../type';

import { classNames } from '@/util/utils';

export default function ArtifactsTabNav({
  content,
  activeArtifactType,
  setActiveArtifactType,
}: {
  content: ArticfactTypeProps[];
  activeArtifactType: ArticfactTypeProps | null;
  setActiveArtifactType: (type: ArticfactTypeProps | null) => void;
}) {
  return (
    <div className="flex flex-row gap-x-4">
      {content.map((item: ArticfactTypeProps) => {
        return (
          <button
            key={item.id}
            type="button"
            aria-label="Change artifact type"
            onClick={() => setActiveArtifactType(item)}
            className={classNames(
              'rounded-full text-sm uppercase tracking-wider text-primary-9',
              activeArtifactType?.id === item.id
                ? 'border border-gray-300 px-5 py-2 font-bold'
                : 'border-white font-normal'
            )}
          >
            {item.name}
          </button>
        );
      })}
    </div>
  );
}
