import { describe, expect, it } from "vitest";
import {
  COMMUNITY_CHAT_PATH,
  COMMUNITY_PATH,
  isChatFocusPath,
  MESSAGES_PATH,
  messagesConversationPath,
  pageTransitionKey,
} from "./chatRoutes";

describe("chat routes", () => {
  it("builds conversation URLs from stable ids", () => {
    expect(messagesConversationPath("abc-123")).toBe("/messages/abc-123");
  });

  it("marks dedicated chat shells as chat-focus", () => {
    expect(isChatFocusPath(COMMUNITY_CHAT_PATH)).toBe(true);
    expect(isChatFocusPath(MESSAGES_PATH)).toBe(true);
    expect(isChatFocusPath("/messages/abc")).toBe(true);
    expect(isChatFocusPath(COMMUNITY_PATH)).toBe(false);
    expect(isChatFocusPath("/")).toBe(false);
  });

  it("keeps page transition keys stable across community tabs and DM threads", () => {
    expect(pageTransitionKey("/community")).toBe("/community");
    expect(pageTransitionKey("/community/chat")).toBe("/community");
    expect(pageTransitionKey("/messages")).toBe("/messages");
    expect(pageTransitionKey("/messages/thread-1")).toBe("/messages");
    expect(pageTransitionKey("/notifications")).toBe("/notifications");
  });
});
