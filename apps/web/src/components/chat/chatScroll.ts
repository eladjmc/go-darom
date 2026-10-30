/** Distance from bottom considered "near bottom" for auto-follow. */
export const CHAT_STICK_BOTTOM_PX = 80;

export function distanceFromBottom(el: { scrollHeight: number; scrollTop: number; clientHeight: number }): number {
  return el.scrollHeight - el.scrollTop - el.clientHeight;
}

export function isNearBottom(
  el: { scrollHeight: number; scrollTop: number; clientHeight: number },
  threshold = CHAT_STICK_BOTTOM_PX,
): boolean {
  return distanceFromBottom(el) <= threshold;
}

export function scrollToBottom(el: { scrollHeight: number; scrollTop: number }): void {
  el.scrollTop = el.scrollHeight;
}

/** Keep the same messages in view after older items are prepended. */
export function restoreScrollAfterPrepend(
  el: { scrollHeight: number; scrollTop: number },
  previousScrollHeight: number,
): void {
  const delta = el.scrollHeight - previousScrollHeight;
  if (delta !== 0) el.scrollTop += delta;
}

export type MessageScrollPlan =
  | { action: "none" }
  | { action: "bottom" }
  | { action: "restore-prepend"; previousScrollHeight: number };

/**
 * Decide scroll behavior from message list identity changes.
 * `previousScrollHeight` must be captured *before* the DOM grows from prepend.
 */
export function planMessageScroll(input: {
  prevLength: number;
  nextLength: number;
  prevFirstId: string | null;
  nextFirstId: string | null;
  stickBottom: boolean;
  loadingOlder: boolean;
  previousScrollHeight: number;
}): MessageScrollPlan {
  const { prevLength, nextLength, prevFirstId, nextFirstId, stickBottom, loadingOlder, previousScrollHeight } = input;

  if (nextLength === 0) return { action: "none" };

  // First paint with messages → show newest at bottom.
  if (prevLength === 0 && nextLength > 0) return { action: "bottom" };

  const grew = nextLength > prevLength;
  if (!grew) return { action: "none" };

  const prepended = nextFirstId != null && nextFirstId !== prevFirstId && prevLength > 0;
  if (prepended) {
    return { action: "restore-prepend", previousScrollHeight };
  }

  if (stickBottom && !loadingOlder) return { action: "bottom" };
  return { action: "none" };
}
