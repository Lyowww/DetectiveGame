/** Absolute minutes from 2024-10-16 00:00, the night before the investigation. */
export function formatClock(absoluteMinute: number): string {
  const minute = ((absoluteMinute % 1440) + 1440) % 1440;
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatDate(absoluteMinute: number): string {
  const day = absoluteMinute >= 1440 ? 17 : 16;
  return `2024-10-${String(day).padStart(2, "0")}`;
}

export function clockOn(day: 16 | 17, hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (day === 17 ? 1440 : 0) + h * 60 + m;
}

export const CASE_START = clockOn(17, "09:40");
export const DEEP_CYCLE = clockOn(17, "11:30");
