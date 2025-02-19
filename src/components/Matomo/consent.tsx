import Link from 'next/link';
import { classNames } from '@/util/utils';

interface CookieNoticeProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function CookieNotice({ isOpen, onAccept, onDecline }: CookieNoticeProps) {
  return (
    <div
      className={classNames(
        'fixed bottom-3 left-3 z-50 items-center justify-center p-4',
        isOpen ? 'flex' : 'hidden'
      )}
    >
      <div className="relative w-full max-w-xl rounded-2xl bg-white  shadow-lg">
        <div className="p-6">
          <h2 className="mb-4 text-2xl font-bold text-primary-8">Cookie notice</h2>

          <p className="mb-6 select-none font-semibold text-primary-8">
            We use cookies to enhance your browsing experience, analyze website traffic with Matomo,
            and improve our services. Matomo helps us understand how you interact with our site
            while respecting your privacy—your data remains on our servers and is not shared with
            third parties.
          </p>
          <div className="my-4 h-px w-full select-none bg-gray-200" />
          <p className="mb-4 font-semibold text-primary-8">
            You can choose to accept or decline tracking cookies. Essential cookies necessary for
            the website to function will always be used.
          </p>

          <div className="flex w-full items-center gap-3">
            <button
              type="button"
              aria-label="accept all cookies"
              onClick={onAccept}
              className={classNames(
                'max-w-max flex-1 rounded-full border border-gray-300 px-5 py-3 font-medium text-primary-8',
                'transition-colors  hover:bg-primary-8 hover:text-white'
              )}
            >
              Accept all cookies
            </button>
            <button
              type="button"
              aria-label="decline tracking"
              onClick={onDecline}
              className={classNames(
                'max-w-max flex-1 rounded-full border border-gray-300 px-5 py-3 font-medium text-primary-8',
                'transition-colors  hover:bg-primary-8 hover:text-white'
              )}
            >
              Decline tracking
            </button>
          </div>

          <p className="mt-6 text-sm text-gray-400">
            For more details, visit our{' '}
            <Link href="/privacy" rel="noopener noreferrer" target="_blank" className="underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
