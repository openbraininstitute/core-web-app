import { CheckCircleFilled } from '@ant-design/icons';

export default function SubscriptionStatus() {
  return (
    <div className="mb-6 transform rounded-lg bg-primary-8 p-6 transition-all duration-500 hover:scale-[1.01] hover:shadow-xl">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="mb-2 text-2xl font-bold">Pro plan</h2>
          <p className="max-w-xl text-blue-200/80">
            An OBI membership offers tools to explore, build, and simulate neuron and brain models,
            leveraging Brain-CODE and expert collaboration for neuroscience breakthroughs.
          </p>
        </div>
        <div className="flex flex-col items-end">
          <div className="mb-2 flex items-center gap-2">
            <CheckCircleFilled className="h-5 w-5 text-green-400" />
            <span className="font-medium text-green-400">Active</span>
          </div>
          <p className="text-gray-300">Next payment: 12.03.2025</p>
        </div>
      </div>
    </div>
  );
}
