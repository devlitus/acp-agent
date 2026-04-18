export function relativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const m = Math.floor(diffMs / 60000);
  const h = Math.floor(diffMs / 3600000);
  const d = Math.floor(diffMs / 86400000);
  if (m < 1) return "Ahora mismo";
  if (m < 60) return `Hace ${m}m`;
  if (h < 24) return `Hace ${h}h`;
  if (d < 7) return `Hace ${d}d`;
  return new Date(timestamp).toLocaleDateString();
}
