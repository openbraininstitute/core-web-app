/**
 * Route Matching Utility
 *
 * Provides functions for matching routes against glob patterns
 * and evaluating message targeting rules.
 *
 * @module utils/route-matcher
 */

import type { IMessageTargeting, ITargetingContext } from "../types";

/**
 * Converts a glob pattern to a regular expression.
 *
 * Supported glob syntax:
 * - `*` matches any characters except `/`
 * - `**` matches any characters including `/`
 * - `?` matches any single character
 * - Literal characters are escaped
 *
 * @param pattern - Glob pattern to convert
 * @returns Regular expression that matches the pattern
 */
function globToRegex(pattern: string): RegExp {
  // Escape special regex characters except glob wildcards
  const regexStr = pattern
    // Escape regex special chars (except * and ?)
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    // Convert ** to a placeholder (to avoid double conversion)
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    // Convert * to match anything except /
    .replace(/\*/g, "[^/]*")
    // Convert ? to match any single character
    .replace(/\?/g, ".")
    // Convert placeholder back to match anything including /
    .replace(/\{\{GLOBSTAR\}\}/g, ".*");

  // Anchor the pattern to match the full path
  return new RegExp(`^${regexStr}$`);
}

/**
 * Checks if a path matches a glob pattern.
 *
 * @param pattern - Glob pattern to match against
 * @param path - Path to test
 * @returns True if the path matches the pattern
 *
 * @example
 * ```typescript
 * matchesRoute('/app/**', '/app/virtual-lab/projects'); // true
 * matchesRoute('/app/*', '/app/virtual-lab'); // true
 * matchesRoute('/app/*', '/app/virtual-lab/projects'); // false (single * doesn't match /)
 * matchesRoute('/explore/neurons', '/explore/neurons'); // true (exact match)
 * ```
 */
export function matchesRoute(pattern: string, path: string): boolean {
  // Handle exact match first (most common case)
  if (pattern === path) {
    return true;
  }

  // Handle patterns without wildcards as exact matches
  if (!pattern.includes("*") && !pattern.includes("?")) {
    return pattern === path;
  }

  // Convert glob to regex and test
  const regex = globToRegex(pattern);
  return regex.test(path);
}

/**
 * Checks if a path matches any of the given route patterns.
 *
 * @param patterns - Array of glob patterns to match against
 * @param path - Path to test
 * @returns True if the path matches at least one pattern
 *
 * @example
 * ```typescript
 * matchesAnyRoute(['/app/**', '/explore/*'], '/app/virtual-lab'); // true
 * matchesAnyRoute(['/admin/**'], '/app/virtual-lab'); // false
 * ```
 */
export function matchesAnyRoute(patterns: string[], path: string): boolean {
  return patterns.some((pattern) => matchesRoute(pattern, path));
}

/**
 * Evaluates if a message's targeting rules match the current context.
 *
 * A message matches if ALL of the following are true:
 * - No route patterns specified, OR path matches at least one route pattern
 * - No user roles specified, OR user has at least one required role
 * - No feature flags specified, OR all required feature flags are enabled
 *
 * @param targeting - Message targeting configuration
 * @param context - Current targeting context (pathname, user roles, feature flags)
 * @returns True if the message should be shown in the current context
 *
 * @example
 * ```typescript
 * const targeting = {
 *   routes: ['/app/**'],
 *   userRoles: ['admin', 'moderator'],
 *   featureFlags: ['new-dashboard']
 * };
 *
 * const context = {
 *   pathname: '/app/virtual-lab',
 *   userRoles: ['admin'],
 *   featureFlags: ['new-dashboard', 'beta-features']
 * };
 *
 * matchesTargeting(targeting, context); // true
 * ```
 */
export function matchesTargeting(
  targeting: IMessageTargeting,
  context: ITargetingContext,
): boolean {
  const { routes, userRoles, featureFlags } = targeting;
  const {
    pathname,
    userRoles: contextRoles,
    featureFlags: contextFlags,
  } = context;

  // Check route patterns (if specified)
  if (routes && routes.length > 0) {
    if (!matchesAnyRoute(routes, pathname)) {
      return false;
    }
  }

  // Check user roles (if specified) - user must have at least one required role
  if (userRoles && userRoles.length > 0) {
    const hasRequiredRole = userRoles.some((role) =>
      contextRoles.includes(role),
    );
    if (!hasRequiredRole) {
      return false;
    }
  }

  // Check feature flags (if specified) - all required flags must be enabled
  if (featureFlags && featureFlags.length > 0) {
    const hasAllFlags = featureFlags.every((flag) =>
      contextFlags.includes(flag),
    );
    if (!hasAllFlags) {
      return false;
    }
  }

  return true;
}

/**
 * Creates a targeting context from the current environment.
 *
 * This is a helper for creating the context object needed by matchesTargeting.
 *
 * @param pathname - Current route pathname
 * @param userRoles - Current user's roles (defaults to empty array)
 * @param featureFlags - Currently enabled feature flags (defaults to empty array)
 * @returns Targeting context object
 */
export function createTargetingContext(
  pathname: string,
  userRoles: string[] = [],
  featureFlags: string[] = [],
): ITargetingContext {
  return {
    pathname,
    userRoles,
    featureFlags,
  };
}

/**
 * Checks if a path is within the app routes scope (/app/virtual-lab).
 *
 * @param pathname - Path to check
 * @returns True if the path is an app route
 */
export function isAppRoute(pathname: string): boolean {
  return pathname.startsWith("/app/virtual-lab");
}

/**
 * Checks if a path is within the website routes scope (not /app/virtual-lab).
 *
 * @param pathname - Path to check
 * @returns True if the path is a website route
 */
export function isWebsiteRoute(pathname: string): boolean {
  return !pathname.startsWith("/app/virtual-lab");
}
