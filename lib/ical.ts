// Minimal iCal (RFC 5545) parser and generator

export type IcalEvent = { start: string; end: string };

export function parseIcal(text: string): IcalEvent[] {
  const events: IcalEvent[] = [];

  // Unfold continuation lines (RFC 5545 §3.1)
  const unfolded = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]/g, "");

  let inEvent = false;
  let dtstart = "";
  let dtend = "";
  let duration = "";

  for (const rawLine of unfolded.split("\n")) {
    const line = rawLine.trim();
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      dtstart = "";
      dtend = "";
      duration = "";
    } else if (line === "END:VEVENT") {
      inEvent = false;
      if (dtstart) {
        const end = dtend || (duration ? applyDuration(dtstart, duration) : dtstart);
        events.push({ start: dtstart, end: end || dtstart });
      }
    } else if (inEvent) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const key = line.slice(0, idx).toUpperCase();
      const val = line.slice(idx + 1).trim();
      if (key.startsWith("DTSTART")) dtstart = toISODate(val);
      else if (key.startsWith("DTEND")) dtend = toISODate(val);
      else if (key === "DURATION") duration = val;
    }
  }

  return events;
}

function toISODate(val: string): string {
  // Strip timezone and time → keep YYYYMMDD → YYYY-MM-DD
  const raw = val.replace(/[TZ].*/, "").slice(0, 8);
  if (raw.length < 8) return "";
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function applyDuration(dateStr: string, duration: string): string {
  const m = duration.match(/P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?)?/);
  if (!m) return dateStr;
  const d = new Date(dateStr + "T12:00:00Z");
  d.setDate(d.getDate() + (parseInt(m[1] || "0") * 7) + parseInt(m[2] || "0"));
  d.setHours(d.getHours() + parseInt(m[3] || "0"));
  return d.toISOString().slice(0, 10);
}

// Expand an event range into individual YYYY-MM-DD strings (start inclusive, end exclusive)
export function expandDates(start: string, end: string): string[] {
  const dates: string[] = [];
  const s = new Date(start + "T12:00:00Z");
  const e = new Date((end || start) + "T12:00:00Z");

  // If start === end (all-day single-day event), end is exclusive → no dates? → include start
  const effectiveEnd = s >= e ? new Date(s.getTime() + 86400000) : e;
  const cur = new Date(s);

  while (cur < effectiveEnd) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// Consolidate a sorted list of YYYY-MM-DD strings into contiguous ranges
// Ranges: start inclusive, end exclusive (iCal convention)
export function consolidateRanges(sortedDates: string[]): Array<{ start: string; end: string }> {
  if (sortedDates.length === 0) return [];

  const ranges: Array<{ start: string; end: string }> = [];
  let rangeStart = sortedDates[0];
  let prev = sortedDates[0];

  for (let i = 1; i < sortedDates.length; i++) {
    const cur = sortedDates[i];
    const prevDate = new Date(prev + "T12:00:00Z");
    prevDate.setDate(prevDate.getDate() + 1);
    const nextDay = prevDate.toISOString().slice(0, 10);

    if (cur === nextDay) {
      prev = cur;
    } else {
      const endDate = new Date(prev + "T12:00:00Z");
      endDate.setDate(endDate.getDate() + 1);
      ranges.push({ start: rangeStart, end: endDate.toISOString().slice(0, 10) });
      rangeStart = cur;
      prev = cur;
    }
  }

  const endDate = new Date(prev + "T12:00:00Z");
  endDate.setDate(endDate.getDate() + 1);
  ranges.push({ start: rangeStart, end: endDate.toISOString().slice(0, 10) });
  return ranges;
}

// Generate a valid iCal file
export function generateIcal(params: {
  listingTitle: string;
  listingId: string;
  appUrl: string;
  ranges: Array<{ start: string; end: string }>;
}): string {
  const { listingTitle, listingId, appUrl, ranges } = params;

  const vevents = ranges.map((r, i) =>
    [
      "BEGIN:VEVENT",
      `UID:${listingId}-${i}-${r.start.replace(/-/g, "")}@kabanalouer`,
      `DTSTART;VALUE=DATE:${r.start.replace(/-/g, "")}`,
      `DTEND;VALUE=DATE:${r.end.replace(/-/g, "")}`,
      "SUMMARY:Indisponible",
      `URL:${appUrl}/chalets/${listingId}`,
      "END:VEVENT",
    ].join("\r\n")
  );

  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Kabanalouer//FR",
      `X-WR-CALNAME:${listingTitle} — Kabanalouer`,
      "X-WR-TIMEZONE:America/Toronto",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      ...vevents,
      "END:VCALENDAR",
    ].join("\r\n") + "\r\n"
  );
}
