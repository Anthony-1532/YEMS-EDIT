export function isResourceAvailable(startTime?: string | Date | null, now: Date = new Date()): boolean {
  if (!startTime) return true;
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  return Number.isNaN(start.getTime()) ? true : now >= start;
}
