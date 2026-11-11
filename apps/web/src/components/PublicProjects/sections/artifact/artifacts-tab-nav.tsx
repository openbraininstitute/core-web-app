import { classNames } from '@/util/utils';

export default function ArtifactsTabNav({
  content,
  activeArtifactType,
  setActiveArtifactType,
}: {
  content: string[];
  activeArtifactType: string | null;
  setActiveArtifactType: (type: string | null) => void;
}) {
  return (
    <div className="flex flex-row gap-x-4">
      {content.map((item: string) => {
        let title;

        switch (item) {
          case 'meModelsTable':
            title = 'ME-Models';
            break;
          case 'eModelsTable':
            title = 'E-Models';
            break;
          case 'synaptomesTable':
            title = 'Synaptome';
            break;
          case 'downloadsLinks':
            title = 'Downloads & Links';
            break;
          default:
            title = item.charAt(0).toUpperCase() + item.slice(1);
            break;
        }

        return (
          <button
            key={item}
            type="button"
            aria-label="Change artifact type"
            onClick={() => setActiveArtifactType(item)}
            className={classNames(
              'text-primary-9 rounded-full text-sm tracking-wider uppercase',
              activeArtifactType === item
                ? 'border border-gray-300 px-5 py-2 font-bold'
                : 'border-white font-normal'
            )}
          >
            {title}
          </button>
        );
      })}
    </div>
  );
}
