// src/client/utils/timestamp.ts

/**
 * Mendapatkan timestamp dalam format Indonesia dengan milidetik
 * Format: DD/MM/YYYY HH:MM:SS.mmm
 */
export function getTimestamp(): string {
  const now = new Date();
  const timestamp = now.toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const milliseconds = String(now.getMilliseconds()).padStart(3, "0");
  return `${timestamp}.${milliseconds}`;
}
