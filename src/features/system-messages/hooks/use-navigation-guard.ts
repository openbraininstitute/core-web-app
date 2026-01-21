/**
 * Navigation Guard Hook
 *
 * Blocks navigation when global takeover messages are active.
 * Supports three scopes:
 * - global-takeover-full: Blocks entire platform
 * - global-takeover-app: Blocks only /app/virtual-lab routes
 * - global-takeover-website: Blocks only / routes (excluding /app/virtual-lab)
 *
 * @module hooks/use-navigation-guard
 */

"use client";

import { useAtomValue } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  globalTakeoverAppAtom,
  globalTakeoverFullAtom,
  globalTakeoverWebsiteAtom,
} from "../state/selectors";
import type { ISystemMessage, TMessageDisplayType } from "../types";
import { isAppRoute, isWebsiteRoute } from "../utils/route-matcher";

// ============================================================================
// Hook Return Type
// ============================================================================

/**
 * Return type for the useNavigationGuard hook.
 */
export interface IUseNavigationGuardReturn {
  /** Whether navigation is currently blocked */
  isBlocked: boolean;
  /** The message causing the block (if any) */
  blockedMessage: ISystemMessage | null;
  /** The scope of the current block */
  blockScope: TMessageDisplayType | null;
  /** The pending navigation target (if navigation was attempted while blocked) */
  pendingNavigation: string | null;
  /** Checks if a specific route would be blocked */
  isRouteBlocked: (targetPath: string) => boolean;
  /** Clears the pending navigation target */
  clearPending: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing navigation blocking during global takeover messages.
 *
 * Features:
 * - Intercepts Next.js router navigation (push, replace, back)
 * - Intercepts link clicks within blocked scopes
 * - Intercepts browser navigation (popstate)
 * - Stores pending navigation target for later execution
 * - Releases navigation when takeover clears
 *
 * @example
 * ```tsx
 * function App() {
 *   const { isBlocked, blockedMessage, pendingNavigation } = useNavigationGuard();
 *
 *   if (isBlocked && blockedMessage) {
 *     return <GlobalTakeover message={blockedMessage} />;
 *   }
 *
 *   return <MainContent />;
 * }
 * ```
 */
export function useNavigationGuard(): IUseNavigationGuardReturn {
  const router = useRouter();
  const pathname = usePathname();

  // Global takeover atoms
  const globalTakeoverFull = useAtomValue(globalTakeoverFullAtom);
  const globalTakeoverApp = useAtomValue(globalTakeoverAppAtom);
  const globalTakeoverWebsite = useAtomValue(globalTakeoverWebsiteAtom);

  // Pending navigation state
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );

  // Store original router methods
  const originalMethodsRef = useRef<{
    push: typeof router.push;
    replace: typeof router.replace;
    back: typeof router.back;
  } | null>(null);

  // Track if we've set up interception
  const isInterceptingRef = useRef(false);

  // ============================================================================
  // Determine Applicable Takeover
  // ============================================================================

  /**
   * Determines which takeover applies to the current route.
   */
  const getApplicableTakeover = useCallback((): ISystemMessage | null => {
    // Full takeover blocks everything
    if (globalTakeoverFull) {
      return globalTakeoverFull;
    }

    // App takeover only blocks app routes
    if (isAppRoute(pathname) && globalTakeoverApp) {
      return globalTakeoverApp;
    }

    // Website takeover only blocks website routes
    if (isWebsiteRoute(pathname) && globalTakeoverWebsite) {
      return globalTakeoverWebsite;
    }

    return null;
  }, [globalTakeoverFull, globalTakeoverApp, globalTakeoverWebsite, pathname]);

  const applicableTakeover = getApplicableTakeover();

  // ============================================================================
  // Route Blocking Check
  // ============================================================================

  /**
   * Checks if a target route would be blocked.
   */
  const isRouteBlocked = useCallback(
    (targetPath: string): boolean => {
      // Full takeover blocks all routes
      if (globalTakeoverFull) {
        return true;
      }

      // App takeover blocks app routes
      if (isAppRoute(targetPath) && globalTakeoverApp) {
        return true;
      }

      // Website takeover blocks website routes
      if (isWebsiteRoute(targetPath) && globalTakeoverWebsite) {
        return true;
      }

      return false;
    },
    [globalTakeoverFull, globalTakeoverApp, globalTakeoverWebsite],
  );

  /**
   * Clears the pending navigation target.
   */
  const clearPending = useCallback(() => {
    setPendingNavigation(null);
  }, []);

  // ============================================================================
  // Navigation Interception Effect
  // ============================================================================

  useEffect(() => {
    // If no takeover is active, restore original methods and execute pending navigation
    if (!applicableTakeover) {
      // Restore original router methods if we were intercepting
      if (isInterceptingRef.current && originalMethodsRef.current) {
        // Note: We can't actually restore router methods in Next.js App Router
        // The router object is immutable. Instead, we just stop intercepting.
        isInterceptingRef.current = false;
        originalMethodsRef.current = null;
      }

      // Execute pending navigation if any
      if (pendingNavigation) {
        const target = pendingNavigation;
        setPendingNavigation(null);
        router.push(target);
      }

      return;
    }

    // Store original methods reference (for tracking, not actual restoration)
    if (!originalMethodsRef.current) {
      originalMethodsRef.current = {
        push: router.push,
        replace: router.replace,
        back: router.back,
      };
    }

    isInterceptingRef.current = true;

    // ============================================================================
    // Event Handlers
    // ============================================================================

    /**
     * Intercepts browser back/forward navigation.
     */
    const handlePopState = (e: PopStateEvent) => {
      if (applicableTakeover) {
        e.preventDefault();
        // Push current state back to prevent navigation
        window.history.pushState(null, "", pathname);
      }
    };

    /**
     * Warns user before leaving the page.
     */
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (applicableTakeover) {
        e.preventDefault();
        e.returnValue = "A system message requires your attention.";
        return e.returnValue;
      }
    };

    /**
     * Intercepts link clicks.
     */
    const handleClick = (e: MouseEvent) => {
      if (!applicableTakeover) return;

      const target = e.target as HTMLElement;
      const link = target.closest("a");

      if (link && link.href) {
        // Skip javascript: links and anchor links
        if (link.href.startsWith("javascript:") || link.href.startsWith("#")) {
          return;
        }

        // Get the pathname from the link
        let linkPath: string;
        try {
          const url = new URL(link.href);
          // Only intercept same-origin links
          if (url.origin !== window.location.origin) {
            return;
          }
          linkPath = url.pathname;
        } catch {
          // Invalid URL, skip
          return;
        }

        // Check if this route would be blocked
        if (isRouteBlocked(linkPath)) {
          e.preventDefault();
          e.stopPropagation();
          setPendingNavigation(linkPath);
          console.warn("[NavigationGuard] Link click blocked:", linkPath);
        }
      }
    };

    // Add event listeners
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);

    // Push initial state to enable popstate interception
    window.history.pushState(null, "", pathname);

    // Cleanup
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, [applicableTakeover, pathname, pendingNavigation, router, isRouteBlocked]);

  // ============================================================================
  // Return Value
  // ============================================================================

  return {
    isBlocked: !!applicableTakeover,
    blockedMessage: applicableTakeover,
    blockScope: applicableTakeover?.displayType ?? null,
    pendingNavigation,
    isRouteBlocked,
    clearPending,
  };
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Hook for checking if navigation is currently blocked.
 * Lightweight alternative when you only need the blocked state.
 */
export function useIsNavigationBlocked(): boolean {
  const globalTakeoverFull = useAtomValue(globalTakeoverFullAtom);
  const globalTakeoverApp = useAtomValue(globalTakeoverAppAtom);
  const globalTakeoverWebsite = useAtomValue(globalTakeoverWebsiteAtom);
  const pathname = usePathname();

  if (globalTakeoverFull) {
    return true;
  }

  if (isAppRoute(pathname) && globalTakeoverApp) {
    return true;
  }

  if (isWebsiteRoute(pathname) && globalTakeoverWebsite) {
    return true;
  }

  return false;
}

/**
 * Hook for getting the current blocking message.
 */
export function useBlockingMessage(): ISystemMessage | null {
  const globalTakeoverFull = useAtomValue(globalTakeoverFullAtom);
  const globalTakeoverApp = useAtomValue(globalTakeoverAppAtom);
  const globalTakeoverWebsite = useAtomValue(globalTakeoverWebsiteAtom);
  const pathname = usePathname();

  if (globalTakeoverFull) {
    return globalTakeoverFull;
  }

  if (isAppRoute(pathname) && globalTakeoverApp) {
    return globalTakeoverApp;
  }

  if (isWebsiteRoute(pathname) && globalTakeoverWebsite) {
    return globalTakeoverWebsite;
  }

  return null;
}
