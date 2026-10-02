import { describe, it, expect } from "vitest";
import { GET } from "./route";

function request(country: string | null): Request {
  return new Request("https://example.test/api/support/on-duty", {
    headers: country ? { "x-vercel-ip-country": country } : {},
  });
}

describe("GET /api/support/on-duty", () => {
  it("is cacheable at the edge and keyed by the geo header", () => {
    const res = GET(request("AR"));
    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=300, stale-while-revalidate=600"
    );
    // Without Vary, a CDN could hand the Spanish agent's schedule to an
    // Argentine visitor.
    expect(res.headers.get("Vary")).toBe("x-vercel-ip-country, cf-ipcountry");
  });

  it("returns an agent payload for a known and an unknown country", () => {
    const known = GET(request("ES"));
    const unknown = GET(request(null));
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    const knownBody = known.headers.get("content-type") ?? "";
    expect(knownBody).toContain("application/json");
  });
});