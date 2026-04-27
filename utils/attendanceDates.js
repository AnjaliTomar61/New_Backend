/** Calendar logic for attendance using Asia/Kolkata (override with ATTENDANCE_TZ). */

const TZ = process.env.ATTENDANCE_TZ || "Asia/Kolkata";

export function istDateString(d = new Date()) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return f.format(d);
}

export function istWeekdayShort(d = new Date()) {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(d);
}

/** Move UTC date by whole days (approx wall-clock step). */
function addUtcDays(d, n) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/**
 * A UTC instant that, when viewed in IST, is the given calendar Y-M-D around midday
 * (avoids boundary issues for weekday checks).
 */
function noonUtcForIstYmd(y, m, d) {
  return new Date(Date.UTC(y, m - 1, d, 6, 30, 0));
}

/** Parse YYYY-MM-DD to y,m,d numbers */
function parseYmd(s) {
  const [y, m, d] = s.split("-").map((x) => parseInt(x, 10));
  return { y, m, d };
}

/** Next calendar day string in TZ by adding 1 day from a YMD string anchor */
export function nextIstYmd(ymd) {
  const { y, m, d } = parseYmd(ymd);
  const next = addUtcDays(noonUtcForIstYmd(y, m, d), 1);
  return istDateString(next);
}

/** Monday of the week containing "today" in TZ, optionally shifted by weekOffset * 7 days. */
export function mondayYmdOfWeek(weekOffset = 0) {
  let anchor = new Date();
  anchor = addUtcDays(anchor, (Number(weekOffset) || 0) * 7);

  for (let back = 0; back < 14; back++) {
    const d = addUtcDays(anchor, -back);
    if (istWeekdayShort(d) === "Mon") {
      return istDateString(d);
    }
  }
  return istDateString(anchor);
}

/** Seven YYYY-MM-DD strings Mon..Sun starting at mondayYmd */
export function weekDatesFromMondayYmd(mondayYmd) {
  const { y, m, d } = parseYmd(mondayYmd);
  const out = [];
  let cur = noonUtcForIstYmd(y, m, d);
  for (let i = 0; i < 7; i++) {
    out.push(istDateString(cur));
    cur = addUtcDays(cur, 1);
  }
  return out;
}

export function dayShortLabel(ymd) {
  const { y, m, d } = parseYmd(ymd);
  const inst = noonUtcForIstYmd(y, m, d);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(inst);
}
