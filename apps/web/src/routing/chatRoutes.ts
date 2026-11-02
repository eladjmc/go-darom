/** Stable SPA paths for community + private messaging (M3). */

export const COMMUNITY_PATH = "/community";
export const COMMUNITY_CHAT_PATH = "/community/chat";
export const MESSAGES_PATH = "/messages";

export function messagesConversationPath(conversationId: string): string {
  return `${MESSAGES_PATH}/${conversationId}`;
}

/** True for dedicated chat shells that should fill the viewport under the header. */
export function isChatFocusPath(pathname: string): boolean {
  if (pathname === COMMUNITY_CHAT_PATH) return true;
  if (pathname === MESSAGES_PATH || pathname.startsWith(`${MESSAGES_PATH}/`)) return true;
  return false;
}

/**
 * Stabilize PageTransition keys so switching conversations or community tabs
 * does not remount the whole messaging shell (draft / socket / list state).
 */
export function pageTransitionKey(pathname: string): string {
  if (pathname === COMMUNITY_PATH || pathname.startsWith(`${COMMUNITY_PATH}/`)) {
    return COMMUNITY_PATH;
  }
  if (pathname === MESSAGES_PATH || pathname.startsWith(`${MESSAGES_PATH}/`)) {
    return MESSAGES_PATH;
  }
  return pathname;
}
