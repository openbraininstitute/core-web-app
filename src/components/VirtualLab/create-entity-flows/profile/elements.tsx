import { CloseCircleFilled } from '@ant-design/icons';

export function ProfileError() {
  return (
    <div className="mb-6 transform rounded-sm bg-red-900 p-6 transition-all duration-500 hover:scale-[1.01] hover:shadow-xl">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="mb-2 text-2xl font-bold text-red-200">Profile error</h2>
          <p className="max-w-xl text-red-200/80">
            We were unable to fetch your profile information from our servers. Please refresh the
            page or try again later. if the issue persists, please contact support at{' '}
            <a href="mailto:support@openbraininstitute.org">support@openbraininstitute.org</a>.
          </p>
        </div>
        <div className="mb-2 flex items-center gap-2 self-baseline">
          <CloseCircleFilled className="text-2xl text-red-500" />
        </div>
      </div>
    </div>
  );
}
