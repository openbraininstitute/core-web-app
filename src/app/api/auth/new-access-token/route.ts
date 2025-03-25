import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';
import { refreshAccessToken } from '@/auth';

export const POST = async (request: NextRequest) => {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return new Response('Unauthorized', {
      status: 401,
      statusText: 'The supplied authentication is not authorized for this action',
    });
  }

  try {
    const newToken = await refreshAccessToken(token);

    return new Response(JSON.stringify({ accessToken: (newToken as any)?.accessToken }), {
      status: 200,
      statusText: 'OK',
    });
  } catch (ex) {
    // captureException(ex);
    return new Response('Server Error', {
      status: 500,
      statusText: `${ex}`,
    });
  }
};
