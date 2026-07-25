"use client";

/**
 * Inline boot script that runs while the browser parses the HTML, before the
 * first paint — used to correct server-rendered markup that depends on
 * client-only state (theme, locale, time zone).
 *
 * The `type` swap keeps React from re-running or warning about the script on
 * the client: the server emits an executable script, the client renders inert
 * `text/plain` and `suppressHydrationWarning` lets the DOM win.
 */
export default function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
