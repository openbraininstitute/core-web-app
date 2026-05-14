import { Button } from '@/ui/molecules/button';

type Props = { onBack: () => void };

export function ContactUs({ onBack }: Props) {
  return (
    <div
      data-testid="contact-us-form"
      className="flex flex-col gap-2 border border-gray-100 p-7 rounded-2xl"
    >
      <h1 className="text-3xl font-semibold text-primary-9">
        Upgrade to Premium – Tell Us Your Needs!
      </h1>
      <p className="text-primary-8 text-lg font-light">
        Let us know your requirements, and we&apos;ll tailor your premium subscription experience to
        fit your needs.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button
          rounded
          type="button"
          variant="outline"
          size="lg"
          className="hover:bg-primary-9! hover:text-white w-max  text-primary-9"
          onClick={onBack}
        >
          Cancel
        </Button>
        <Button rounded asChild type="button" variant="shadow" size="lg" className="w-max">
          <a href="mailto:subscription@openbraininstitute.org?subject=Premium Subscription Inquiry">
            Contact us
          </a>
        </Button>
      </div>
    </div>
  );
}
