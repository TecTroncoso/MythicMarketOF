export type SupportShift = {
  from: string; // "HH:MM" 24h, inclusive
  to: string; // "HH:MM" 24h, exclusive
};

export type SupportPerson = {
  id: string; // "ar" | "es"
  label: string; // "AR" | "ES"
  number: string; // international format without "+"
  timezone: string; // IANA name
  shifts: SupportShift[];
};

export type OnDutyInfo = {
  number: string;
  label: string | null; // person label ("AR"/"ES") or null
  isOpen: boolean;
  shiftName: string | null;
};

export const SUPPORT_TIMEZONE = "America/Argentina/Buenos_Aires"; // kept for backwards compat

// Generic shifts for now — the owner can adjust later.
export const SUPPORT_PEOPLE: SupportPerson[] = [
  {
    id: "ar",
    label: "AR",
    number: "5491136799182", // Argentine owner (real)
    timezone: "America/Argentina/Buenos_Aires",
    shifts: [{ from: "07:00", to: "24:00" }],
  },
  {
    id: "es",
    label: "ES",
    number: "34642084779", // Spanish partner (real)
    timezone: "Europe/Madrid",
    shifts: [{ from: "08:00", to: "24:00" }],
  },
];

// Used when closed (off-hours) or when getOnDuty fails.
export const SUPPORT_FALLBACK_NUMBER = "5491136799182";

export const SUPPORT_WELCOME_MESSAGE =
  "¡Hola! ¿En qué podemos ayudarte? Escríbenos tu consulta.";

export const LATAM_COUNTRY_CODES: ReadonlySet<string> = new Set([
  "AR", "BO", "BR", "CL", "CO", "CR", "CU", "DO", "EC", "GT",
  "HN", "MX", "NI", "PA", "PE", "PY", "SV", "UY", "VE",
]);

export const EUROPE_COUNTRY_CODES: ReadonlySet<string> = new Set([
  "ES", "AD", "AT", "BE", "BG", "CH", "CY", "CZ", "DE", "DK", "EE",
  "FI", "FR", "GB", "GR", "HR", "HU", "IE", "IS", "IT", "LI", "LT",
  "LU", "LV", "MC", "MT", "NL", "NO", "PL", "PT", "RO", "SE", "SI", "SK",
]);

// One formatter per timezone, built lazily. h23 cycle guarantees hour parts
// are 00-23 (hour12: false alone can emit "24" for midnight in some runtimes).
const formatters = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timezone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      hourCycle: "h23",
      timeZone: timezone,
    });
    formatters.set(timezone, formatter);
  }
  return formatter;
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesSinceMidnight(now: Date, timezone: string): number {
  const parts = getFormatter(timezone).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function isInShift(currentMinutes: number, fromMinutes: number, toMinutesValue: number): boolean {
  if (toMinutesValue <= fromMinutes) {
    // Overnight shift (e.g. 23:00-09:00): matches after start OR before end.
    return currentMinutes >= fromMinutes || currentMinutes < toMinutesValue;
  }
  return currentMinutes >= fromMinutes && currentMinutes < toMinutesValue;
}

/**
 * Country code (ISO 3166-1 alpha-2, uppercase) → person.
 * Latin America → AR person, Europe → ES person,
 * unknown/missing → default (AR, the first person in SUPPORT_PEOPLE).
 */
export function resolvePerson(countryCode?: string | null): SupportPerson {
  const code = countryCode?.toUpperCase();
  if (code && LATAM_COUNTRY_CODES.has(code)) {
    return SUPPORT_PEOPLE[0]; // ar
  }
  if (code && EUROPE_COUNTRY_CODES.has(code)) {
    return SUPPORT_PEOPLE[1]; // es
  }
  return SUPPORT_PEOPLE[0]; // default: ar
}

/**
 * Evaluates one person's shifts in THEIR timezone at the given instant.
 * Overnight shifts (from > to) supported. First matching shift wins.
 */
export function isPersonOnDuty(person: SupportPerson, now: Date): boolean {
  const currentMinutes = minutesSinceMidnight(now, person.timezone);
  return person.shifts.some((shift) =>
    isInShift(currentMinutes, toMinutes(shift.from), toMinutes(shift.to)),
  );
}

/**
 * Geo + schedule combined. number = resolved person's number ALWAYS (even
 * off-hours — the message waits for their next shift); isOpen = on-duty.
 */
export function getOnDutyInfo(now: Date, countryCode?: string | null): OnDutyInfo {
  const person = resolvePerson(countryCode);
  const isOpen = isPersonOnDuty(person, now);
  return {
    number: person.number,
    label: person.label,
    isOpen,
    shiftName: isOpen ? person.label : null,
  };
}