import { basePath } from '@/config';

export default async function subscribeNewsletterHandler({
  email,
  name,
}: {
  email: string;
  name: string;
}) {
  const response = await fetch(`${basePath}/api/newsletter`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, name }),
  });
  const result = await response.json();
  if (response.ok) {
    return { subscribed: true, message: result.message };
  }
  throw Error(result.message, { cause: result });
}
