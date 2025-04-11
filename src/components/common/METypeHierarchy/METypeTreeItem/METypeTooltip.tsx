import { ConfigProvider, Spin, Tooltip } from 'antd';
import { ClassNexus } from '@/api/ontologies/types';
import { ETYPE_NEXUS_TYPE, MTYPE_NEXUS_TYPE } from '@/constants/ontologies';

export function METypeTooltip({
  metadata,
  isLeaf,
  title,
}: {
  metadata?: ClassNexus;
  isLeaf: boolean;
  title?: string;
}) {
  return (
    <ConfigProvider
      theme={{
        components: {
          Tooltip: {
            borderRadius: 0,
            paddingSM: 15,
            paddingXS: 15,
          },
        },
      }}
    >
      <Tooltip
        overlayStyle={{ width: 'fit-content', maxWidth: '500px' }}
        color="#FFF"
        title={
          metadata ? (
            <CompositionTooltip title={metadata.prefLabel} subclasses={metadata.subClassOf} />
          ) : (
            <Spin />
          )
        }
      >
        <span
          className={`font-bold ${isLeaf ? 'text-secondary-4 whitespace-nowrap' : 'text-white'}`}
        >
          {title}
        </span>
      </Tooltip>
    </ConfigProvider>
  );
}

function CompositionTooltip({ title, subclasses }: { title?: string; subclasses?: string[] }) {
  const renderType = () => {
    if (subclasses?.includes(MTYPE_NEXUS_TYPE)) {
      return 'M-type';
    }
    if (subclasses?.includes(ETYPE_NEXUS_TYPE)) {
      return 'E-type';
    }
    return undefined;
  };

  if (!title || !subclasses) {
    return <div className="text-primary-8">Cell type information could not be retrieved</div>;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="text-primary-8 grow font-bold">{title}</div>
      <div className="text-neutral-4 flex-none">{renderType()}</div>
    </div>
  );
}
