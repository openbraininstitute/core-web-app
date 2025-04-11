'use client';

import NewsletterForm from '@/components/coming-soon/newsletter-form';
import LogoAsLink from '@/components/logo/as-link';

import { Bluesky, LinkedinIn, TwitterX } from '@/components/icons/SocialIcons';
import { EnumSection } from '@/components/LandingPage/sections/sections';
import { classNames } from '@/util/utils';

function Section({
  section,
  setSection,
  children,
}: {
  section: EnumSection;
  setSection: (section: EnumSection) => void;
  children: string;
}) {
  return (
    <div
      className={classNames(
        'relative transition-colors',
        'border-neutral-2 m-0 flex flex-row items-center gap-8 border-b p-0',
        'after:absolute after:-bottom-1 after:left-0 after:h-1 after:w-full after:bg-white',
        'after:scale-x-0 after:transition-transform after:duration-300 hover:after:scale-x-100',
        'hover:after:bg-primary-8',
        'last:border-b-0 md:last:border-b'
      )}
    >
      <button
        type="button"
        onClick={() => setSection(section)}
        className="text-primary-8 cursor-pointer py-2 text-lg font-bold"
      >
        {children}
      </button>
    </div>
  );
}

function Social({ className }: { className?: string }) {
  return (
    <div className={classNames('flex flex-col flex-wrap gap-4 md:flex-row', className)}>
      <a
        aria-label="linkedin"
        href="https://www.linkedin.com/company/openbraininstitute/"
        className="border-neutral-2 text-primary-8 hover:text-primary-9 inline-flex cursor-pointer items-center border-b py-2 hover:opacity-65 md:border-0"
      >
        <LinkedinIn className="h-7 w-7 md:h-7 md:w-7" />
      </a>
      <a
        aria-label="x"
        href="https://x.com/OpenBrainInst"
        className="border-neutral-2 text-primary-8 hover:text-primary-9 inline-flex cursor-pointer items-center border-b py-2 hover:opacity-65 md:border-0"
      >
        <TwitterX className="h-7 w-7 md:h-7 md:w-7" />
      </a>
      <a
        aria-label="bluesky"
        href="https://bsky.app/profile/openbraininst.bsky.social"
        className="text-primary-8 hover:text-primary-9 inline-flex cursor-pointer items-center py-2 hover:opacity-65 md:border-0"
      >
        <Bluesky className="h-7 w-7 md:h-7 md:w-7" />
      </a>
    </div>
  );
}

export default function Footer({ className }: { className?: string }) {
  return (
    <>
      <div
        className={classNames(
          'bg-white',
          'gap-4 p-2 text-white md:p-4 lg:grid lg:grid-cols-3 lg:p-6',
          'md:grid md:grid-cols-[1fr_minmax(max-content,300px)_1fr]',
          className
        )}
      >
        <div className="bg-neutral-2 flex flex-col items-end justify-between p-3">
          <LogoAsLink color="text-primary-8" />
          <div className="mt-20 text-base text-[#595959] md:mt-0">
            Copyright &copy; {new Date().getFullYear()} – Open Brain Institute
          </div>
        </div>
        <div className="flex flex-col gap-4 px-2 py-4 md:px-0 md:py-0">
          <div className="flex flex-col gap-4">
            <Section section={EnumSection.Mission} setSection={() => {}}>
              Our mission
            </Section>
            <Section section={EnumSection.Pricing} setSection={() => {}}>
              Pricing
            </Section>
            <Section section={EnumSection.Team} setSection={() => {}}>
              Our team
            </Section>
            <Section section={EnumSection.TermsAndConditions} setSection={() => {}}>
              Terms and conditions
            </Section>
            <Section section={EnumSection.Contact} setSection={() => {}}>
              Contact
            </Section>
          </div>
          <Social />
        </div>
        <div className="border-neutral-2 border p-4">
          <h2 className="text-primary-8 p-2 font-serif text-3xl leading-[2.7rem] font-semibold lg:text-4xl">
            Subscribe to our <br /> newsletter
          </h2>
          <NewsletterForm key="footer-newsletter-form" cls={{ container: 'p-2!' }} />
        </div>
      </div>
    </>
  );
}
