import { Collapse, CollapseProps } from 'antd';

import Parent from '@/features/entities/circuit/elements/related-circuits/parent';
import Root from '@/features/entities/circuit/elements/related-circuits/root';
import { classNames } from '@/util/utils';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

type Props = {
  circuit: ICircuit;
};

export default function RelatedPublications({ circuit }: Props) {
  const items: CollapseProps['items'] = [
    {
      key: 'parent',
      label: 'Parent circuit',
      children: <Parent circuit={circuit} />,
    },
    {
      key: 'root',
      label: 'Root circuit',
      children: <Root circuit={circuit} />,
    },
  ];

  return (
    <div className="mt-5">
      <Collapse
        ghost
        bordered={false}
        items={items}
        collapsible="header"
        defaultActiveKey={['parent', 'root']}
        expandIcon={() => null}
        className={classNames(
          '[&_.ant-collapse-item]:mb-2',
          '[&_.ant-collapse-header]:bg-primary-8 [&_.ant-collapse-header]:border-none [&_.ant-collapse-header]:text-white!',
          '[&_.ant-collapse-header]:rounded-none! [&_.ant-collapse-header]:text-lg [&_.ant-collapse-header]:font-semibold'
        )}
      />
    </div>
  );
}
