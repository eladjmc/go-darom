import { describe, expect, it } from "vitest";
import { evaluateProposalRespond, evaluateProposalWithdraw } from "@go-darom/shared";

describe("mutual no-winner proposal ownership", () => {
  const pending = { by: "alice", status: "pending" as const };

  it("initiator consent is the propose; they cannot respond to themselves", () => {
    const self = evaluateProposalRespond(pending, "alice", "no_winner");
    expect(self.ok).toBe(false);
    if (self.ok) return;
    expect(self.code).toBe("NO_WINNER_SELF");
  });

  it("only the opponent may accept or reject", () => {
    expect(evaluateProposalRespond(pending, "bob", "no_winner").ok).toBe(true);
  });

  it("initiator may withdraw before opponent answers", () => {
    expect(evaluateProposalWithdraw(pending, "alice", "no_winner").ok).toBe(true);
    const opp = evaluateProposalWithdraw(pending, "bob", "no_winner");
    expect(opp.ok).toBe(false);
    if (opp.ok) return;
    expect(opp.code).toBe("NO_WINNER_NOT_OWNER");
  });

  it("stale respond after withdraw/reject/finish is rejected (reconnect & duplicates)", () => {
    expect(evaluateProposalRespond(null, "bob", "no_winner").ok).toBe(false);
    expect(evaluateProposalRespond({ by: "alice", status: "done" }, "bob", "no_winner").ok).toBe(
      false,
    );
    expect(evaluateProposalWithdraw(null, "alice", "no_winner").ok).toBe(false);
  });
});
