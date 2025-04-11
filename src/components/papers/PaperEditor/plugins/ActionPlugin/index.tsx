import { Button } from 'antd';

export default function ActionPlugin() {
  return (
    <div className="fixed right-[3.3rem] bottom-3 z-50 flex items-center justify-end gap-3 py-4">
      <Button
        htmlType="button"
        type="primary"
        className="bg-primary-8 h-12 rounded-none px-12 text-lg"
      >
        Preview
      </Button>
      <Button
        htmlType="button"
        type="primary"
        className="bg-primary-8 h-12 rounded-none px-12 text-lg"
      >
        Export
      </Button>
    </div>
  );
}
