import { describe, expect, it } from "vitest";
import { parseReportSnapshot } from "./report-snapshot.js";

describe("parseReportSnapshot", () => {
  it("extracts reported sender and bounded messages without requiring raw UI dump", () => {
    const parsed = parseReportSnapshot({
      reportedMessageId: "m2",
      messages: [
        {
          id: "m1",
          threadSeq: 1,
          body: "לפני",
          createdAt: "2026-01-01T00:00:00.000Z",
          isReported: false,
          sender: { id: "a", nickname: "א", avatarUrl: null },
        },
        {
          id: "m2",
          threadSeq: 2,
          body: "מדווח",
          createdAt: "2026-01-01T00:01:00.000Z",
          isReported: true,
          sender: { id: "b", nickname: "ב", avatarUrl: null },
        },
      ],
    });
    expect(parsed.reportedMessageId).toBe("m2");
    expect(parsed.reported?.nickname).toBe("ב");
    expect(parsed.messages).toHaveLength(2);
    expect(parsed.messages.filter((m) => m.isReported)).toHaveLength(1);
  });

  it("tolerates empty/invalid snapshots", () => {
    expect(parseReportSnapshot(null).messages).toEqual([]);
    expect(parseReportSnapshot({}).reported).toBeNull();
  });
});
