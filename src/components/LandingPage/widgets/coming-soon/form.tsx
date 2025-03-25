import Main from '@/components/coming-soon/main';
import NewsletterForm from '@/components/coming-soon/newsletter-form';

export default function ComingSoonForm() {
  return (
    <div className="flex w-full min-w-full flex-col items-start justify-start">
      <Main />
      <NewsletterForm key="main-newsletter-form" />
    </div>
  );
}
