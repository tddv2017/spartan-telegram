/**
 * Parses ISO timestamps and MetaTrader timestamps consistently in every WebView.
 * MetaTrader sends `YYYY.MM.DD HH:mm:ss`, which Safari/WebKit does not parse.
 */
export function parseTimestampMs(value: unknown): number {
  if (value instanceof Date) return value.getTime();

  if (typeof value === 'number') {
    return value < 10_000_000_000 ? value * 1000 : value;
  }

  if (typeof value !== 'string') return Number.NaN;
  const text = value.trim();
  if (!text) return Number.NaN;

  const mt = text.match(
    /^(\d{4})[.-](\d{2})[.-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/
  );
  if (mt) {
    const [, year, month, day, hour, minute, second] = mt;
    return Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
  }

  return Date.parse(text);
}

export function normalizeTimestampIso(
  value: unknown,
  fallbackMs: number = Date.now()
): string {
  const parsed = parseTimestampMs(value);
  return new Date(Number.isFinite(parsed) ? parsed : fallbackMs).toISOString();
}
