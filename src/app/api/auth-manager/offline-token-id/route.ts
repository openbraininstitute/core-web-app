import { NextRequest } from 'next/server';

import { AuthManagerError, AuthManagerErrorDict } from '@/services/auth-manager/auth/vault-errors';
import { revokeOfflineToken } from '@/services/auth-manager/use-cases/revoke-offline-token';
import { GetStorage } from '@/services/auth-manager/auth/token-vault-factory';
import { validateRequest } from '@/services/auth-manager/auth/validate-token';
import {
  makeAuthManagerError,
  makeAuthManagerErrorResponse,
  makeAuthManagerOkResponse,
} from '@/services/auth-manager/auth/response';
import z from 'zod';

/**
 * Handles the GET request for retrieving the persistent token ID associated with a user session.
 *
 * @param request - The incoming HTTP request object of type `NextRequest`.
 * @returns A response object:
 * - If the request is valid and a persistent token is found, returns a success response containing the `persistentTokenId` and `sessionId`.
 * - If the request is invalid or the token/session is not found, returns an appropriate error response.
 *
 * @throws {AuthManagerError} If there is an issue retrieving the persistent token or other authentication-related errors occur.
 */
export async function POST(request: NextRequest) {
  try {
    const validation = await validateRequest(request);

    if (!validation.valid) {
      return makeAuthManagerError(
        new AuthManagerError(AuthManagerErrorDict.unauthorized.code, {
          reason: 'Token is not valid',
        })
      );
    }

    if (!validation.sessionId) {
      return makeAuthManagerError(
        new AuthManagerError(AuthManagerErrorDict.unauthorized.code, {
          reason: 'No session id was found',
        })
      );
    }

    const storage = GetStorage();
    const persistentToken = await storage.retrieveUserPersistentIdBySession(validation.sessionId);

    if (!persistentToken) {
      throw new AuthManagerError(AuthManagerErrorDict.token_not_found.code, {
        reason: 'Persistent token not found for user session',
      });
    }

    return makeAuthManagerOkResponse({
      persistentTokenId: persistentToken.id,
      sessionId: persistentToken.sessionId,
    });
  } catch (error) {
    return makeAuthManagerErrorResponse(error);
  }
}

/**
 * Handles the DELETE request to revoke an offline token.
 *
 * @param request - The incoming HTTP request of type `NextRequest`.
 * @returns A response indicating the result of the operation:
 * - If the request is invalid, an unauthorized error response is returned.
 * - If the token revocation is successful, an OK response with the result is returned.
 * - If an error occurs during processing, an error response is returned.
 *
 * @throws Will propagate any unexpected errors encountered during the operation.
 */
export async function DELETE(request: NextRequest) {
  try {
    const validation = await validateRequest(request);

    if (!validation.valid) {
      return makeAuthManagerError(new AuthManagerError(AuthManagerErrorDict.unauthorized.code));
    }
    const searchParams = request.nextUrl.searchParams;
    const id = await z.string().uuid().parseAsync(searchParams.get('id'));

    const result = await revokeOfflineToken({
      sessionStateId: validation.sessionId,
      id,
    });

    return makeAuthManagerOkResponse(result);
  } catch (error) {
    return makeAuthManagerErrorResponse(error);
  }
}
