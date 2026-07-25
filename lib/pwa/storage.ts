/** localStorage keys for install dismissal / reminders (client-only). */

export const PWA_STORAGE = {
  installDismissedAt: "rek-pwa-install-dismissed-at",
  installNever: "rek-pwa-install-never",
  updateLaterAt: "rek-pwa-update-later-at",
  interactionSeen: "rek-pwa-user-interacted",
} as const;

const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const UPDATE_LATER_MS = 4 * 60 * 60 * 1000; // 4 hours

export function markUserInteracted() {
  try {
    localStorage.setItem(PWA_STORAGE.interactionSeen, "1");
  } catch {
    /* ignore */
  }
}

export function hasUserInteracted(): boolean {
  try {
    return localStorage.getItem(PWA_STORAGE.interactionSeen) === "1";
  } catch {
    return false;
  }
}

export function dismissInstall(permanent = false) {
  try {
    if (permanent) localStorage.setItem(PWA_STORAGE.installNever, "1");
    localStorage.setItem(PWA_STORAGE.installDismissedAt, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function canShowInstallPrompt(): boolean {
  try {
    if (localStorage.getItem(PWA_STORAGE.installNever) === "1") return false;
    const raw = localStorage.getItem(PWA_STORAGE.installDismissedAt);
    if (!raw) return true;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return true;
    return Date.now() - ts > DISMISS_COOLDOWN_MS;
  } catch {
    return true;
  }
}

export function deferUpdate() {
  try {
    localStorage.setItem(PWA_STORAGE.updateLaterAt, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function canShowUpdatePrompt(): boolean {
  try {
    const raw = localStorage.getItem(PWA_STORAGE.updateLaterAt);
    if (!raw) return true;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return true;
    return Date.now() - ts > UPDATE_LATER_MS;
  } catch {
    return true;
  }
}
