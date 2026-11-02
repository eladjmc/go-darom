import { describe, expect, it } from "vitest";
import { evaluateProposalRespond, evaluateProposalWithdraw } from "./games.js";

describe("mutual proposal respond AuthZ", () => {
  const pending = { by: "alice", status: "pending" as const };

  it("allows only the opponent to respond to no-winner", () => {
    expect(evaluateProposalRespond(pending, "bob", "no_winner").ok).toBe(true);
    const self = evaluateProposalRespond(pending, "alice", "no_winner");
    expect(self.ok).toBe(false);
    if (self.ok) return;
    expect(self.code).toBe("NO_WINNER_SELF");
  });

  it("allows only the opponent to respond to undo", () => {
    expect(evaluateProposalRespond(pending, "bob", "undo").ok).toBe(true);
    const self = evaluateProposalRespond(pending, "alice", "undo");
    expect(self.ok).toBe(false);
    if (self.ok) return;
    expect(self.code).toBe("UNDO_SELF");
  });

  it("rejects stale / missing proposals (refresh & duplicate respond)", () => {
    expect(evaluateProposalRespond(null, "bob", "no_winner").ok).toBe(false);
    expect(evaluateProposalRespond({ by: "alice", status: "cleared" }, "bob", "undo").ok).toBe(false);
  });
});

describe("mutual proposal withdraw AuthZ", () => {
  const pending = { by: "alice", status: "pending" as const };

  it("allows only the initiator to withdraw", () => {
    expect(evaluateProposalWithdraw(pending, "alice", "no_winner").ok).toBe(true);
    expect(evaluateProposalWithdraw(pending, "alice", "undo").ok).toBe(true);
    const opp = evaluateProposalWithdraw(pending, "bob", "no_winner");
    expect(opp.ok).toBe(false);
    if (opp.ok) return;
    expect(opp.code).toBe("NO_WINNER_NOT_OWNER");
  });

  it("rejects withdraw when nothing is pending", () => {
    expect(evaluateProposalWithdraw(null, "alice", "undo").ok).toBe(false);
  });
});
