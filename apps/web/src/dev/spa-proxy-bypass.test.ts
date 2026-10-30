import { describe, expect, it } from "vitest";
import { shouldBypassApiProxyForSpa } from "./spa-proxy-bypass";

describe("shouldBypassApiProxyForSpa", () => {
  it("serves SPA for browser document navigations", () => {
    expect(
      shouldBypassApiProxyForSpa({
        accept: "text/html,application/xhtml+xml",
        "sec-fetch-dest": "document",
      }),
    ).toBe(true);
  });

  it("proxies JSON API fetches", () => {
    expect(
      shouldBypassApiProxyForSpa({
        accept: "application/json",
      }),
    ).toBe(false);
  });

  it("serves SPA when Accept prefers HTML without sec-fetch-dest", () => {
    expect(
      shouldBypassApiProxyForSpa({
        accept: "text/html,*/*",
      }),
    ).toBe(true);
  });
});
