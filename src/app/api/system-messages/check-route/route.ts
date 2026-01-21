/**
 * System Messages Route Check API
 *
 * Lightweight endpoint for checking if a route has a blocking system message.
 * Used by the middleware to intercept routes with active route-specific messages.
 *
 * @module api/system-messages/check-route
 */

import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/system-messages/check-route
 *
 * Checks if there's a route-specific system message blocking the given path.
 *
 * Query Parameters:
 * - path: The route path to check
 *
 * Response:
 * - hasBlockingMessage: boolean - Whether there's a blocking message
 * - messageId: string | null - The ID of the blocking message (if any)
 */
export async function GET(request: NextRequest) {
  // Verify this is an internal request from middleware
  const isInternalRequest =
    request.headers.get("x-internal-request") === "true";

  if (!isInternalRequest) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json(
      { error: "Missing path parameter" },
      { status: 400 },
    );
  }

  try {
    // TODO: Implement actual message checking logic
    // This would typically:
    // 1. Query the database for active route-specific messages
    // 2. Check if any message's targeting.routes patterns match the path
    // 3. Return the highest priority matching message ID

    // For now, return no blocking message
    // This allows the feature to be deployed without breaking existing functionality
    return NextResponse.json({
      hasBlockingMessage: false,
      messageId: null,
    });
  } catch (error) {
    console.error("[check-route] Error checking route messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
