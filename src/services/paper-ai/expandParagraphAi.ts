import { bbsMlBaseUrl } from '@/config';

export default async function handleAiExpandParagraph(text: string): Promise<string> {
  const response = await fetch(`${bbsMlBaseUrl}/qa/passthrough`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({
      query: `
        Expand the following text ${text} by providing additional details,
        to enhance its clarity and comprehensiveness:
      `,
    }),
  });

  if (response.ok) {
    return (await response.json()).answer;
  }
  throw new Error('Ai expand paragraph failed');
}
