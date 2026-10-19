const TAIPEI_TZ = "Asia/Taipei";

// 回傳台北時區的日期字串 YYYY-MM-DD
export function taipeiDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TAIPEI_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// 以台北時區的「今天」為基準，往前/往後位移天數
export function shiftDateString(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
