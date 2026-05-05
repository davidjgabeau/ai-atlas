"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";

const WARM_ROUTES = [
  "/companies",
  "/categories",
  "/patterns",
  "/feed",
  "/insights",
];

export function RouteTransitionFeedback() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const clearTimerRef = useRef<number | null>(null);
  const prefetchedRef = useRef(new Set<string>());
  const currentHref = useMemo(
    () => `${pathname}${search ? `?${search}` : ""}`,
    [pathname, search],
  );
  const pending = pendingRoute !== null && pendingRoute !== currentHref;

  useEffect(() => {
    if (pendingRoute === currentHref) {
      clearPendingTimer(clearTimerRef);
    }
  }, [currentHref, pendingRoute]);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-route-pending", pending);

    return () => {
      document.documentElement.removeAttribute("data-route-pending");
    };
  }, [pending]);

  useEffect(() => {
    function warmRoute(href: string) {
      const route = getInternalRoute(href);
      if (!route || route === currentHref || prefetchedRef.current.has(route)) {
        return;
      }

      prefetchedRef.current.add(route);
      router.prefetch(route);
    }

    function startPendingNavigation(href: string) {
      const route = getInternalRoute(href);
      if (!route || route === currentHref) return;

      clearPendingTimer(clearTimerRef);
      setPendingRoute(route);
      clearTimerRef.current = window.setTimeout(() => {
        setPendingRoute(null);
      }, 6000);
    }

    function handleIntent(event: Event) {
      const link = getLinkFromEvent(event);
      if (!link) return;

      warmRoute(link.href);
    }

    function handleClick(event: MouseEvent) {
      if (shouldIgnorePrimaryNavigation(event)) return;

      const link = getLinkFromEvent(event);
      if (!link || link.target || link.hasAttribute("download")) return;

      warmRoute(link.href);
      startPendingNavigation(link.href);
    }

    function handlePointerDown(event: PointerEvent) {
      if (shouldIgnorePrimaryNavigation(event)) return;

      const link = getLinkFromEvent(event);
      if (!link || link.target || link.hasAttribute("download")) return;

      startPendingNavigation(link.href);
    }

    document.addEventListener("pointerover", handleIntent, {
      capture: true,
      passive: true,
    });
    document.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
      passive: true,
    });
    document.addEventListener("focusin", handleIntent, true);
    document.addEventListener("click", handleClick, true);

    const idleId = scheduleIdleWork(() => {
      for (const route of WARM_ROUTES) {
        warmRoute(route);
      }
    });

    return () => {
      document.removeEventListener("pointerover", handleIntent, true);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("focusin", handleIntent, true);
      document.removeEventListener("click", handleClick, true);
      cancelIdleWork(idleId);
      clearPendingTimer(clearTimerRef);
    };
  }, [currentHref, router]);

  return (
    <div
      aria-hidden="true"
      className="route-transition-feedback"
      data-pending={pending}
    />
  );
}

function getLinkFromEvent(event: Event) {
  const target = event.target;
  if (!(target instanceof Element)) return null;

  return target.closest<HTMLAnchorElement>("a[href]");
}

function shouldIgnorePrimaryNavigation(event: MouseEvent | PointerEvent) {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

function getInternalRoute(href: string) {
  let url: URL;

  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }

  if (url.origin !== window.location.origin) return null;

  const route = `${url.pathname}${url.search}`;
  const currentRoute = `${window.location.pathname}${window.location.search}`;
  if (route === currentRoute && url.hash) return null;

  return route;
}

function scheduleIdleWork(callback: () => void) {
  const browserWindow = window as WindowWithIdleCallbacks;

  if (browserWindow.requestIdleCallback) {
    return browserWindow.requestIdleCallback(callback, { timeout: 2500 });
  }

  return browserWindow.setTimeout(callback, 1200);
}

function cancelIdleWork(id: number) {
  const browserWindow = window as WindowWithIdleCallbacks;

  if (browserWindow.cancelIdleCallback) {
    browserWindow.cancelIdleCallback(id);
    return;
  }

  browserWindow.clearTimeout(id);
}

function clearPendingTimer(timerRef: MutableRefObject<number | null>) {
  if (timerRef.current === null) return;

  window.clearTimeout(timerRef.current);
  timerRef.current = null;
}

type WindowWithIdleCallbacks = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => number;
  cancelIdleCallback?: (id: number) => void;
};
