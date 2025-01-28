import { feedbackUrl } from '@/config';

export default function postIssue(data = {}) {
  if (typeof feedbackUrl !== 'string') {
    throw Error(`Config parameter "feedbackUrl" is missing!`);
  }

  return fetch(feedbackUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}
