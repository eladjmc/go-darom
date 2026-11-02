/**
 * SQL builders for local admin bootstrap.
 * Kept separate so Vitest can assert parameter typing without hitting Postgres.
 */

/** Promote a single member → admin (no-op for non-members). */
export function buildPromoteUpdate(userId) {
  return {
    text: `update users
       set role = 'admin', updated_at = now()
       where id = $1::uuid and role = 'member'
       returning id, role, nickname`,
    values: [userId],
  };
}

/**
 * Audit insert for admin_bootstrap.
 *
 * IMPORTANT: actor_id is uuid, entity_id is text. Never reuse one unbound $n for both
 * or Postgres raises: "inconsistent types deduced for parameter $1".
 */
export function buildAuditInsert(userId, detail) {
  return {
    text: `insert into moderation_audit_log (actor_id, action, entity_type, entity_id, detail)
       values ($1::uuid, 'admin_bootstrap', 'user', $2::text, $3::jsonb)`,
    values: [userId, String(userId), JSON.stringify(detail)],
  };
}
