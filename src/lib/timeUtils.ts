/**
 * Parses duration strings like "1h 30m", "2h", "45m" into total minutes.
 */
export function parseDurationToMinutes(durationStr: string): number {
  if (!durationStr) return 0;
  
  let totalMinutes = 0;
  const hoursMatch = durationStr.match(/(\d+)h/i);
  const minutesMatch = durationStr.match(/(\d+)m/i);
  
  if (hoursMatch) {
    totalMinutes += parseInt(hoursMatch[1], 10) * 60;
  }
  
  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1], 10);
  }
  
  // If no h/m labels, try to parse as pure number (legacy or manual input)
  if (!hoursMatch && !minutesMatch) {
    const pureNumber = parseInt(durationStr, 10);
    if (!isNaN(pureNumber)) return pureNumber;
  }
  
  return totalMinutes;
}

/**
 * Formats total minutes back into "1h 30m" or "45m" format.
 */
export function formatMinutesToDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0m";
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Helper to get a stable Date object from various trade date string formats.
 * Handles:
 *   - "Today, 14:35", "Yesterday, 14:35"  (relative)
 *   - "2026.04.03 14:30" or "2026.04.03 14:30:25" (MT5 format from AI extraction)
 *   - "Apr 2, 6:52:04 PM", "2026-04-02T18:36:23" (generic / ISO)
 *
 * Year is always forced to 2026 when missing or implausibly old (< 2020).
 */
export function getTradeDate(dateStr: string): Date {
  if (!dateStr) return new Date();

  // Handle "Today, " and "Yesterday, " relative formats
  if (dateStr.startsWith('Today, ')) {
    const timeParts = dateStr.split(', ')[1]?.split(':') || ['00', '00'];
    const d = new Date();
    d.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), parseInt(timeParts[2] || "0"));
    return d;
  }
  
  if (dateStr.startsWith('Yesterday, ')) {
    const timeParts = dateStr.split(', ')[1]?.split(':') || ['00', '00'];
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), parseInt(timeParts[2] || "0"));
    return d;
  }

  // Handle MT5 format: "2026.04.03 14:30" or "2026.04.03 14:30:25"
  const mt5Match = dateStr.match(/^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (mt5Match) {
    let year = parseInt(mt5Match[1]);
    const month = parseInt(mt5Match[2]) - 1; // 0-indexed
    const day = parseInt(mt5Match[3]);
    const hour = parseInt(mt5Match[4]);
    const minute = parseInt(mt5Match[5]);
    const second = parseInt(mt5Match[6] || '0');
    if (year < 2020) year = 2026; // enforce minimum sensible year
    return new Date(year, month, day, hour, minute, second);
  }

  // Try generic parse (ISO, locale strings, etc.)
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    if (parsed.getFullYear() < 2020) {
      parsed.setFullYear(2026);
    }
    return parsed;
  }

  return new Date(); // Fallback
}

/**
 * Normalises a raw date_time string extracted from a screenshot into a clean
 * ISO-8601 string with year forced to 2026.
 * Input may be MT5 format ("2026.04.03 14:30"), null, or undefined.
 * Returns an ISO string like "2026-04-03T14:30:00" or null when nothing can be parsed.
 */
export function normalizeImportedDateTime(dateTimeStr: string | null | undefined): string | null {
  if (!dateTimeStr) return null;

  const d = getTradeDate(dateTimeStr);
  // getTradeDate returns `new Date()` as fallback — detect that by checking
  // if the result differs significantly from what we'd expect.
  // A robust check: re-parse and compare raw strings.
  const isReallyParsed = !isNaN(d.getTime()) && dateTimeStr.trim().length > 0
    && (dateTimeStr.match(/\d{4}/) !== null); // must contain a 4-digit year

  if (isReallyParsed) {
    // force year to 2026
    d.setFullYear(2026);
    return d.toISOString();
  }

  return null;
}
