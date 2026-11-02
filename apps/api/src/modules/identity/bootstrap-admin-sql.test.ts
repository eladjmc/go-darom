import { describe, expect, it } from "vitest";
import { buildAuditInsert, buildPromoteUpdate } from "../../../../../scripts/bootstrap-admin-sql.mjs";

describe("bootstrap-admin SQL typing", () => {
  const userId = "11111111-1111-1111-1111-111111111111";

  it("does not reuse one unbound parameter for uuid actor_id and text entity_id", () => {
    const { text, values } = buildAuditInsert(userId, {
      source: "test",
      path: "cli",
    });

    // Regression for: "inconsistent types deduced for parameter $1"
    // when values ($1, ..., $1, ...) mixed uuid + text columns.
    expect(text).toMatch(/\$1::uuid/);
    expect(text).toMatch(/\$2::text/);
    expect(text).toMatch(/\$3::jsonb/);
    expect(text).not.toMatch(/values\s*\(\s*\$1\s*,\s*'admin_bootstrap'\s*,\s*'user'\s*,\s*\$1\b/i);

    expect(values).toHaveLength(3);
    expect(values[0]).toBe(userId);
    expect(values[1]).toBe(userId);
    expect(values[0]).not.toBe(values[2]);
    expect(typeof values[2]).toBe("string");
    expect(() => JSON.parse(String(values[2]))).not.toThrow();
  });

  it("scopes promote update to a single member uuid", () => {
    const { text, values } = buildPromoteUpdate(userId);
    expect(text).toMatch(/where id = \$1::uuid and role = 'member'/);
    expect(values).toEqual([userId]);
  });
});
