import { InfoCircleFilled } from '@ant-design/icons';

export default function CardError() {
  return (
    <div className="w-full rounded-[6px] border border-red-100 bg-white p-6">
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <InfoCircleFilled className="mb-4 text-4xl text-red-500" />
        <h3 className="text-primary-8 mb-2 text-lg font-bold">Failed to load model data</h3>
        <p className="text-primary-8 mb-4">
          There was an error loading this model&apos;s details. Please try again.
        </p>
      </div>
    </div>
  );
}
