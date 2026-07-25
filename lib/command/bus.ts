import type { PaletteMode } from "@/lib/command/types";

type Listener = (open: boolean, mode?: PaletteMode) => void;

const listeners = new Set<Listener>();

export function subscribeCommandPalette(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function openCommandPalette(mode: PaletteMode = "search") {
  listeners.forEach((l) => l(true, mode));
  window.dispatchEvent(
    new CustomEvent("rek:command-palette-open", { detail: { mode } })
  );
}

export function closeCommandPalette() {
  listeners.forEach((l) => l(false));
}

export function toggleCommandPalette(mode: PaletteMode = "search") {
  window.dispatchEvent(
    new CustomEvent("rek:command-palette-toggle", { detail: { mode } })
  );
}

export function openCheatSheet() {
  window.dispatchEvent(new CustomEvent("rek:cheat-sheet-open"));
}

export function toggleCheatSheet() {
  window.dispatchEvent(new CustomEvent("rek:cheat-sheet-toggle"));
}
