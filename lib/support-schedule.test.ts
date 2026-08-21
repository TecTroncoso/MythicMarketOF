import { describe, it, expect } from "vitest";
import {
  SUPPORT_FALLBACK_NUMBER,
  SUPPORT_PEOPLE,
  getOnDutyInfo,
  isPersonOnDuty,
  resolvePerson,
} from "@/lib/support-schedule";

// Buenos Aires is UTC-3 year-round (no DST), so AR wall time = UTC - 3h:
// 13:00Z = 10:00 AR, 19:59Z = 16:59 AR, 20:00Z = 17:00 AR, 23:00Z = 20:00 AR,
// 05:00Z = 02:00 AR, 03:30Z = 00:30 AR, 11:00Z = 08:00 AR, 15:00Z = 12:00 AR,
// 12:00Z = 09:00 AR, 10:00Z = 07:00 AR, 09:59Z = 06:59 AR, 03:00Z = 00:00 AR,
// 02:30Z = 23:30 AR.
// Madrid in August is CEST (UTC+2), so ES wall time = UTC + 2h:
// 08:00Z = 10:00 Madrid, 15:00Z = 17:00 Madrid, 21:30Z = 23:30 Madrid,
// 22:00Z = 00:00 Madrid, 01:00Z = 03:00 Madrid, 06:00Z = 08:00 Madrid.

const AR_PERSON = SUPPORT_PEOPLE[0];
const ES_PERSON = SUPPORT_PEOPLE[1];

describe("resolvePerson", () => {
  it("maps AR (LATAM) to the Argentine person", () => {
    const person = resolvePerson("AR");
    expect(person.id).toBe("ar");
    expect(person.number).toBe("5491136799182");
  });

  it("maps any LATAM country to the Argentine person (MX)", () => {
    expect(resolvePerson("MX").id).toBe("ar");
  });

  it("maps ES to the Spanish person", () => {
    const person = resolvePerson("ES");
    expect(person.id).toBe("es");
    expect(person.number).toBe("34642084779");
  });

  it("maps any European country to the Spanish person (DE)", () => {
    expect(resolvePerson("DE").id).toBe("es");
  });

  it("maps other countries to the default Argentine person (US)", () => {
    expect(resolvePerson("US").id).toBe("ar");
  });

  it("maps undefined/null to the default Argentine person", () => {
    expect(resolvePerson(undefined).id).toBe("ar");
    expect(resolvePerson(null).id).toBe("ar");
  });

  it("is case-insensitive (lowercase es still resolves to es)", () => {
    expect(resolvePerson("es").id).toBe("es");
  });
});

describe("isPersonOnDuty (AR person, 07:00-24:00 Buenos Aires)", () => {
  it("is on duty at 10:00 AR", () => {
    expect(isPersonOnDuty(AR_PERSON, new Date("2026-08-18T13:00:00.000Z"))).toBe(true);
  });

  it("is on duty at 17:00 AR (extended evening)", () => {
    expect(isPersonOnDuty(AR_PERSON, new Date("2026-08-18T20:00:00.000Z"))).toBe(true);
  });

  it("is on duty at 23:30 AR", () => {
    expect(isPersonOnDuty(AR_PERSON, new Date("2026-08-19T02:30:00.000Z"))).toBe(true);
  });

  it("is on duty exactly at 07:00 AR (from is inclusive)", () => {
    expect(isPersonOnDuty(AR_PERSON, new Date("2026-08-18T10:00:00.000Z"))).toBe(true);
  });

  it("is NOT on duty exactly at 00:00 AR (to is exclusive)", () => {
    expect(isPersonOnDuty(AR_PERSON, new Date("2026-08-19T03:00:00.000Z"))).toBe(false);
  });

  it("is NOT on duty at 06:59 AR", () => {
    expect(isPersonOnDuty(AR_PERSON, new Date("2026-08-18T09:59:00.000Z"))).toBe(false);
  });

  it("is NOT on duty at 02:00 AR", () => {
    expect(isPersonOnDuty(AR_PERSON, new Date("2026-08-18T05:00:00.000Z"))).toBe(false);
  });
});

describe("isPersonOnDuty (ES person, 08:00-24:00 Madrid)", () => {
  it("is on duty at 10:00 Madrid", () => {
    expect(isPersonOnDuty(ES_PERSON, new Date("2026-08-18T08:00:00.000Z"))).toBe(true);
  });

  it("is on duty at 17:00 Madrid (evening coverage)", () => {
    expect(isPersonOnDuty(ES_PERSON, new Date("2026-08-18T15:00:00.000Z"))).toBe(true);
  });

  it("is on duty at 23:30 Madrid", () => {
    expect(isPersonOnDuty(ES_PERSON, new Date("2026-08-18T21:30:00.000Z"))).toBe(true);
  });

  it("is NOT on duty exactly at 00:00 Madrid (to is exclusive)", () => {
    expect(isPersonOnDuty(ES_PERSON, new Date("2026-08-18T22:00:00.000Z"))).toBe(false);
  });

  it("is NOT on duty at 03:00 Madrid", () => {
    expect(isPersonOnDuty(ES_PERSON, new Date("2026-08-18T01:00:00.000Z"))).toBe(false);
  });
});

describe("isPersonOnDuty (overnight shifts)", () => {
  const overnightPerson = {
    id: "n",
    label: "N",
    number: "5491136799999",
    timezone: "America/Argentina/Buenos_Aires",
    shifts: [{ from: "23:00", to: "09:00" }],
  };

  it("matches just after midnight (00:30 AR)", () => {
    expect(isPersonOnDuty(overnightPerson, new Date("2026-08-18T03:30:00.000Z"))).toBe(true);
  });

  it("matches before the shift end (08:00 AR)", () => {
    expect(isPersonOnDuty(overnightPerson, new Date("2026-08-18T11:00:00.000Z"))).toBe(true);
  });

  it("does not match outside the overnight window (12:00 AR)", () => {
    expect(isPersonOnDuty(overnightPerson, new Date("2026-08-18T15:00:00.000Z"))).toBe(false);
  });

  it("does not match exactly at the exclusive end (09:00 AR)", () => {
    expect(isPersonOnDuty(overnightPerson, new Date("2026-08-18T12:00:00.000Z"))).toBe(false);
  });
});

describe("getOnDutyInfo (geo + schedule)", () => {
  it("ES visitor during her shift: ES number, isOpen true", () => {
    const info = getOnDutyInfo(new Date("2026-08-18T08:00:00.000Z"), "ES");
    expect(info).toEqual({
      number: "34642084779",
      label: "ES",
      isOpen: true,
      shiftName: "ES",
    });
  });

  it("ES visitor off-hours: still her number, isOpen false, shiftName null", () => {
    const info = getOnDutyInfo(new Date("2026-08-18T01:00:00.000Z"), "ES");
    expect(info).toEqual({
      number: "34642084779",
      label: "ES",
      isOpen: false,
      shiftName: null,
    });
  });

  it("AR visitor during the shift: AR number, isOpen true", () => {
    const info = getOnDutyInfo(new Date("2026-08-18T13:00:00.000Z"), "AR");
    expect(info.number).toBe("5491136799182");
    expect(info.isOpen).toBe(true);
  });

  it("AR visitor off-hours: AR number, isOpen false", () => {
    const info = getOnDutyInfo(new Date("2026-08-18T05:00:00.000Z"), "AR");
    expect(info.number).toBe("5491136799182");
    expect(info.isOpen).toBe(false);
  });

  it("no country during AR shift: defaults to AR person, isOpen true", () => {
    const info = getOnDutyInfo(new Date("2026-08-18T13:00:00.000Z"));
    expect(info.number).toBe("5491136799182");
    expect(info.label).toBe("AR");
    expect(info.isOpen).toBe(true);
  });

  it("no country off-hours: fallback number, isOpen false", () => {
    const info = getOnDutyInfo(new Date("2026-08-18T05:00:00.000Z"));
    expect(info.isOpen).toBe(false);
    expect(info.number).toBe(SUPPORT_FALLBACK_NUMBER);
  });
});