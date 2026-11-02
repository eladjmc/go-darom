/** Hebrew relative time from a server ISO timestamp (informational only). */
export function formatRelativeHe(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const sec = Math.round((now - then) / 1000);
  if (sec < 20) return "עכשיו";
  if (sec < 90) return "לפני דקה";
  if (sec < 3600) return `לפני ${Math.floor(sec / 60)} דקות`;
  if (sec < 5400) return "לפני שעה";
  if (sec < 86400) return `לפני ${Math.floor(sec / 3600)} שעות`;
  if (sec < 172800) return "אתמול";
  if (sec < 604800) return `לפני ${Math.floor(sec / 86400)} ימים`;
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatAbsoluteHe(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("he-IL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
