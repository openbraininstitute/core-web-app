import { Form } from 'antd';
import { useAtomValue } from 'jotai';
import { loadable } from 'jotai/utils';

import { Select } from '@/components/VirtualLab/create-entity-flows/common/inputs';
import { virtualLabsOfUserAtom } from '@/state/virtual-lab/lab';

export default function List() {
  const list = useAtomValue(loadable(virtualLabsOfUserAtom));
  return (
    <div
      data-testid="labs-dropdown-list"
      className="mx-auto h-full w-full max-w-5xl grow bg-white p-12"
    >
      <div className="flex h-full grow flex-col">
        <Form.Item
          label={
            <div className="text-left">
              <span className="font-semibold text-primary-8">Select virtual lab</span>
              <p className="font-light text-primary-7">
                Each project must be assigned to a virtual lab. Please select the lab where you want
                this project to reside.
              </p>
            </div>
          }
          name="virtual_lab_id"
          className="w-full flex-1"
        >
          <Select
            data-testid="labs-dropdown"
            size="large"
            options={
              list.state === 'hasData'
                ? list.data?.results.map((i) => ({ value: i.id, label: i.name }))
                : []
            }
            loading={list.state === 'loading'}
            className="border!"
          />
        </Form.Item>
      </div>
    </div>
  );
}
