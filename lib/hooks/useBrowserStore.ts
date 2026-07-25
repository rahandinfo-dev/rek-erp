"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Browser-only values (connectivity, media queries, the wall clock) read
 * through `useSyncExternalStore` so the server render and the hydration render
 * always agree: React uses the server snapshot for both, then swaps in the real
 * value once hydration is finished.
 */

function noopSubscribe() {
  return () => {};
}

/* ------------------------------------------------------------------ online */

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getOnlineServerSnapshot() {
  return true;
}

/** `navigator.onLine`, assumed `true` until the browser says otherwise. */
export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot
  );
}

/* ------------------------------------------------------------ media query */

const mediaQueryCache = new Map<string, MediaQueryList>();

function mediaQueryFor(query: string) {
  let mq = mediaQueryCache.get(query);
  if (!mq) {
    mq = window.matchMedia(query);
    mediaQueryCache.set(query, mq);
  }
  return mq;
}

/** `matchMedia(query)`, always `false` on the server. */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = mediaQueryFor(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query]
  );
  const getSnapshot = useCallback(() => mediaQueryFor(query).matches, [query]);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/* ------------------------------------------------------------------- clock */

const clockListeners = new Set<() => void>();
let clockTimer: number | null = null;
// Cached so `getSnapshot` stays referentially stable between ticks.
let clockNow = 0;

function startClock() {
  clockNow = Date.now();
  clockTimer = window.setInterval(() => {
    clockNow = Date.now();
    clockListeners.forEach((listener) => listener());
  }, 1000);
}

function subscribeClock(onChange: () => void) {
  clockListeners.add(onChange);
  if (clockTimer === null) startClock();
  return () => {
    clockListeners.delete(onChange);
    if (clockListeners.size === 0 && clockTimer !== null) {
      window.clearInterval(clockTimer);
      clockTimer = null;
    }
  };
}

function getClockSnapshot() {
  return clockNow;
}

function getClockServerSnapshot() {
  return 0;
}

/**
 * `Date.now()` refreshed once per second, shared by every subscriber so there
 * is a single timer per page. Returns `0` while rendering on the server and
 * while `active` is false, which callers treat as "no relative time yet".
 */
export function useNow(active = true) {
  const subscribe = active ? subscribeClock : noopSubscribe;
  const getSnapshot = active ? getClockSnapshot : getClockServerSnapshot;
  return useSyncExternalStore(subscribe, getSnapshot, getClockServerSnapshot);
}
