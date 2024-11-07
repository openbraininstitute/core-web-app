import authFetch from '@/authFetch';
import { nexus } from '@/config';

async function checkAndCreateAgent(id: string): Promise<void> {
  // Try to GET the resource
  const getResponse = await authFetch(
    `${nexus.url}/resources/bbp/agents/_/${encodeURIComponent(id)}`
  );

  const data = {
    '@id': id,
  };

  if (getResponse.status === 404) {
    await authFetch(
      `${nexus.url}/resources/bbp/agents/https%3A%2F%2Fneuroshapes.org%2Fdash%2Fperson`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );
  }
}

export async function checkAndCreateAgents(ids: string[]) {
  // Use Promise.all to handle all requests concurrently
  await Promise.all(ids.map((id) => checkAndCreateAgent(id)));
}
