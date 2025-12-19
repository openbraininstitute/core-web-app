import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

type Props = { onBack: () => void };

export default function ContactUs({ onBack }: Props) {
  return (
    <div className="h-full max-h-max">
      <div data-testid="contact-us-form" className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white">Upgrade to Premium – Tell Us Your Needs!</h1>
        <p className="text-primary-3 text-lg font-light">
          Let us know your requirements, and we&apos;ll tailor your premium subscription experience
          to fit your needs.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            rounded
            type="button"
            variant="ghost"
            size="lg"
            className="hover:border-primary-4! w-max border border-none text-white shadow-2xl hover:border"
            onClick={onBack}
          >
            Cancel
          </Button>
          <Button
            rounded
            asChild
            type="button"
            variant="default"
            size="lg"
            className={cn(
              'border-primary-4! w-max border shadow-2xl',
              'hover:bg-primary-8/40',
              'hover:shadow-[1px_2px_4px_0px_#00000099]',
              'shadow-[8px_12px_24px_0px_#00000099]',
              'shadow-[-8px_-8px_42px_0px_#FFFFFF29]',
            )}
          >
            <a href="mailto:subscription@openbraininstitute.org?subject=Premium Subscription Inquiry">
              Contact us
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
