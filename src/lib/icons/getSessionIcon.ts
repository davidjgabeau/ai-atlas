export const CURSOR_ICON_STORAGE_KEY = "aiatlas:cursorIcon";

export const CURSOR_ICONS = [
  "globe.png",
  "map.png",
  "pin.png",
  "skyline.png",
  "compass.png",
  "bridge-mini.png",
] as const;

export type CursorIcon = (typeof CURSOR_ICONS)[number];

export function getOrCreateCursorIcon(): CursorIcon {
  if (typeof window === "undefined") return "bridge-mini.png";

  const storedIcon = window.localStorage.getItem(CURSOR_ICON_STORAGE_KEY);
  if (isCursorIcon(storedIcon)) return storedIcon;

  const icon = getRandomCursorIcon();
  window.localStorage.setItem(CURSOR_ICON_STORAGE_KEY, icon);
  return icon;
}

export function isCursorIcon(icon: string | null): icon is CursorIcon {
  return CURSOR_ICONS.includes(icon as CursorIcon);
}

function getRandomCursorIcon() {
  const index = getRandomIndex(CURSOR_ICONS.length);
  return CURSOR_ICONS[index] ?? "bridge-mini.png";
}

function getRandomIndex(length: number) {
  if (length <= 1) return 0;

  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const values = new Uint32Array(1);
    cryptoApi.getRandomValues(values);
    return values[0] % length;
  }

  return Math.floor(Math.random() * length);
}
