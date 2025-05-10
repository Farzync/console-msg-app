export function getTimestamp(): string {
  const now = new Date();
  return now.toLocaleString("id-ID"); // atau bisa pakai format custom
}
