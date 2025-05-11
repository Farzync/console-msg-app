/**
 * Retrieves the current timestamp in Indonesian format with milliseconds.
 * The format is: DD/MM/YYYY HH:MM:SS.mmm
 * Example: 11/05/2025 14:35:21.123
 *
 * @returns A string representing the current timestamp
 */
export function getTimestamp(): string {
  const now = new Date(); // Get the current date and time
  const timestamp = now.toLocaleString("id-ID", {
    day: "2-digit", // 2-digit day
    month: "2-digit", // 2-digit month
    year: "numeric", // Full year
    hour: "2-digit", // 2-digit hour
    minute: "2-digit", // 2-digit minute
    second: "2-digit", // 2-digit second
    hour12: false, // Use 24-hour format
  });

  const milliseconds = String(now.getMilliseconds()).padStart(3, "0"); // Format milliseconds to 3 digits
  return `${timestamp}.${milliseconds}`; // Return timestamp in the desired format
}
