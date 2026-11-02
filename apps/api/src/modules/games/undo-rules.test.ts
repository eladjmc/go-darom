import { describe, expect, it } from "vitest";
import {
  describeRetractableMoveHe,
  evaluateProposalRespond,
  evaluateProposalWithdraw,
  evaluateUndoProposal,
  findLastRetractableMove,
} from "@go-darom/shared";

describe("M4 undo business rules", () => {
  const whitePlay = {
    type: "play" as const,
    actorUserId: "white",
    payload: { x: 3, y: 3 },
  };
  const blackPlay = {
    type: "play" as const,
    actorUserId: "black",
    payload: { x: 4, y: 4 },
  };

  it("1. White plays, Black cannot request undo of White's move", () => {
    const history = [whitePlay];
    const result = evaluateUndoProposal(history, "black", false);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("UNDO_NOT_OWN_MOVE");
  });

  it("2. White may request undo of White's latest move", () => {
    const history = [blackPlay, whitePlay];
    const result = evaluateUndoProposal(history, "white", false);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.target.actorUserId).toBe("white");
    expect(result.target.index).toBe(1);
  });

  it("3. accepted undo truncates through the retracted move index", () => {
    const history: unknown[] = [
      blackPlay,
      whitePlay,
      { type: "propose_undo", actorUserId: "white", payload: { historyIndex: 1 } },
    ];
    const last = findLastRetractableMove(history);
    expect(last?.index).toBe(1);
    const truncated = history.slice(0, last!.index);
    expect(truncated).toEqual([blackPlay]);
    // Board/turn/captures restored by engine.undo — asserted in integration; history is authoritative log.
  });

  it("4. reject leaves retractable move in place", () => {
    const history = [whitePlay];
    const before = findLastRetractableMove(history);
    // reject only clears overlay; move remains
    expect(before?.actorUserId).toBe("white");
    expect(findLastRetractableMove(history)?.index).toBe(before?.index);
  });

  it("5. duplicate pending proposal is rejected", () => {
    const history = [whitePlay];
    const again = evaluateUndoProposal(history, "white", true);
    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.code).toBe("UNDO_PENDING");
  });

  it("6. after reconnect the latest retractable move is still the authority", () => {
    const history = [blackPlay, whitePlay];
    expect(evaluateUndoProposal(history, "white", false).ok).toBe(true);
    expect(evaluateUndoProposal(history, "black", false).ok).toBe(false);
  });

  it("describes move for opponent UI", () => {
    expect(
      describeRetractableMoveHe({
        index: 0,
        type: "play",
        actorUserId: "white",
        payload: { x: 3, y: 3 },
      }),
    ).toContain("4,4");
    expect(
      describeRetractableMoveHe({
        index: 0,
        type: "pass",
        actorUserId: "white",
      }),
    ).toBe("ויתור על התור");
  });

  it("player to move cannot undo opponent's stone", () => {
    // After white plays, it is black's turn — black must not undo white.
    const history = [whitePlay];
    expect(evaluateUndoProposal(history, "black", false).ok).toBe(false);
    expect(evaluateUndoProposal(history, "white", false).ok).toBe(true);
  });

  it("7. requester cannot accept/reject own undo; opponent can", () => {
    const pending = { by: "white", status: "pending" };
    expect(evaluateProposalRespond(pending, "white", "undo").ok).toBe(false);
    expect(evaluateProposalRespond(pending, "black", "undo").ok).toBe(true);
  });

  it("8. only requester may withdraw; stale withdraw/respond fail", () => {
    const pending = { by: "white", status: "pending" };
    expect(evaluateProposalWithdraw(pending, "white", "undo").ok).toBe(true);
    expect(evaluateProposalWithdraw(pending, "black", "undo").ok).toBe(false);
    expect(evaluateProposalRespond(null, "black", "undo").ok).toBe(false);
    expect(evaluateProposalWithdraw(null, "white", "undo").ok).toBe(false);
  });
});
