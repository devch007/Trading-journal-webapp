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
 * Handles "Apr 2, 6:52:04 PM", "Today, 14:35", "2026-04-02T18:36:23"
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

  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    if (parsed.getFullYear() < 2020) {
      parsed.setFullYear(2026);
    }
    return parsed;
  }

  return new Date(); // Fallback
}
