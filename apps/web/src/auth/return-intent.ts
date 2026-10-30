import { isAllowedReturnIntent } from "@go-darom/shared";

const KEY = "go_darom_return_intent";

export function rememberReturnIntent(path: string): void {
  if (!isAllowedReturnIntent(path)) return;
  sessionStorage.setItem(KEY, path);
}

export function consumeReturnIntent(fallback = "/"): string {
  const raw = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);
  if (raw && isAllowedReturnIntent(raw)) return raw;
  return fallback;
}

export function peekReturnIntent(): string | null {
  const raw = sessionStorage.getItem(KEY);
  if (raw && isAllowedReturnIntent(raw)) return raw;
  return null;
}

export function clearReturnIntent(): void {
  sessionStorage.removeItem(KEY);
}
