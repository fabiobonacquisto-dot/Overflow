/**
 * Multi-granularity period keys for The Gauntlet's weekly/monthly/quarterly
 * leaderboards. Ledger Core's Producer Score stays on the simpler
 * month-only helpers in lib/scoring.ts — this module is Gauntlet-specific.
 */

export const PERIOD_TYPES = ["weekly", "monthly", "quarterly"] as const;
export type PeriodType = (typeof PERIOD_TYPES)[number];

export const PERIOD_TYPE_LABELS: Record<PeriodType, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function mondayOf(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function firstThursdayOfYear(year: number): Date {
  const d = new Date(year, 0, 1);
  while (d.getDay() !== 4) d.setDate(d.getDate() + 1);
  return d;
}

function weekKey(date: Date): string {
  const monday = mondayOf(date);
  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);
  const year = thursday.getFullYear();
  const firstThursday = firstThursdayOfYear(year);
  const weekNum = Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

function weekBounds(period: string): { start: Date; end: Date } {
  const [yearStr, weekStr] = period.split("-W");
  const year = Number(yearStr);
  const week = Number(weekStr);
  const firstThursday = firstThursdayOfYear(year);
  const thursdayOfWeek = new Date(firstThursday);
  thursdayOfWeek.setDate(firstThursday.getDate() + (week - 1) * 7);
  const monday = mondayOf(thursdayOfWeek);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  return { start: monday, end: nextMonday };
}

function quarterKey(date: Date): string {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-Q${quarter}`;
}

function quarterBounds(period: string): { start: Date; end: Date } {
  const [yearStr, qStr] = period.split("-Q");
  const year = Number(yearStr);
  const quarter = Number(qStr);
  const startMonth = (quarter - 1) * 3;
  return { start: new Date(year, startMonth, 1), end: new Date(year, startMonth + 3, 1) };
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthBounds(period: string): { start: Date; end: Date } {
  const [year, month] = period.split("-").map(Number);
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) };
}

export function periodKeyFor(date: Date, type: PeriodType): string {
  if (type === "weekly") return weekKey(date);
  if (type === "quarterly") return quarterKey(date);
  return monthKey(date);
}

export function periodBoundsFor(period: string, type: PeriodType): { start: Date; end: Date } {
  if (type === "weekly") return weekBounds(period);
  if (type === "quarterly") return quarterBounds(period);
  return monthBounds(period);
}

export function formatPeriodLabelFor(period: string, type: PeriodType): string {
  const { start, end } = periodBoundsFor(period, type);
  if (type === "weekly") {
    const lastDay = new Date(end.getTime() - 1);
    const sameMonth = start.getMonth() === lastDay.getMonth();
    const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endLabel = lastDay.toLocaleDateString("en-US", {
      month: sameMonth ? undefined : "short",
      day: "numeric",
      year: "numeric",
    });
    return `Week of ${startLabel} – ${endLabel}`;
  }
  if (type === "quarterly") {
    const [year, q] = period.split("-Q");
    return `Q${q} ${year}`;
  }
  return start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
