import { describe, it, expect } from "vitest";
import { getClientIp } from "@/lib/client-ip";

describe("getClientIp()", () => {
  it("prefers x-real-ip when both headers are present", () => {
    const headers = new Headers({
      "x-real-ip": "10.0.0.1",
      "x-forwarded-for": "203.0.113.5, 10.0.0.2",
    });
    expect(getClientIp(headers)).toBe("10.0.0.1");
  });

  it("falls back to the first ip of x-forwarded-for when x-real-ip is absent", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.2" });
    expect(getClientIp(headers)).toBe("203.0.113.5");
  });

  it("returns 'unknown' when no ip header is present", () => {
    expect(getClientIp(new Headers())).toBe("unknown");
  });

  it("treats blank x-real-ip as absent and uses x-forwarded-for", () => {
    const headers = new Headers({
      "x-real-ip": "   ",
      "x-forwarded-for": "203.0.113.9",
    });
    expect(getClientIp(headers)).toBe("203.0.113.9");
  });

  it("returns 'unknown' when x-forwarded-for is an empty string", () => {
    const headers = new Headers({ "x-forwarded-for": "" });
    expect(getClientIp(headers)).toBe("unknown");
  });
});
