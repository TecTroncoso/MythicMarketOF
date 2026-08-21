import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { lookupPlayer } from "@/lib/mlbb/client";

// Build a Response-like object with `ok` and a JSON body.
const jsonResponse = (body: unknown, ok = true) =>
  ({ ok, json: async () => body }) as unknown as Response;

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("lookupPlayer — Banana primary", () => {
  it("returns Banana result on primary success, with country uppercased", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        status: "success",
        result: { nickname: "*Legend__gamer*", country: "ph" },
      })
    );

    const result = await lookupPlayer("569296372", "10012");
    expect(result).toEqual({ nickname: "*Legend__gamer*", country: "PH" });
    // All three upstreams fire concurrently; Banana's success wins.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("bananagameshop.com");
    expect(url).toContain("id=569296372");
    expect(url).toContain("serverid=10012");
  });
});

describe("lookupPlayer — fallback chain", () => {
  it("falls back to GoPay when Banana fails", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock
      // Banana: throws
      .mockRejectedValueOnce(new Error("banana down"))
      // GoPay: success with countryOrigin lowercase
      .mockResolvedValueOnce(
        jsonResponse({
          message: "Success",
          data: { username: "*GoPayUser*", countryOrigin: "ph" },
        })
      );

    const result = await lookupPlayer("569296372", "10012");
    expect(result).toEqual({ nickname: "*GoPayUser*", country: "PH" });
    // All three upstreams fire concurrently; GoPay's success is the first
    // non-null result.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toContain("gopay.co.id");
  });

  it("falls back to ISAN when first two fail", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock
      .mockRejectedValueOnce(new Error("banana down"))
      .mockRejectedValueOnce(new Error("gopay down"))
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          name: "*IsanUser*",
          country: "id",
        })
      );

    const result = await lookupPlayer("569296372", "10012");
    expect(result).toEqual({ nickname: "*IsanUser*", country: "ID" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const thirdUrl = fetchMock.mock.calls[2][0];
    expect(thirdUrl).toContain("api.isan.eu.org");
  });

  it("returns null when all three upstreams reject", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock
      .mockRejectedValueOnce(new Error("1"))
      .mockRejectedValueOnce(new Error("2"))
      .mockRejectedValueOnce(new Error("3"));

    const result = await lookupPlayer("569296372", "10012");
    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("falls back when Banana returns non-success status", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: "error" }))
      .mockResolvedValueOnce(
        jsonResponse({
          message: "Success",
          data: { username: "*GoPayUser*", countryOrigin: "ph" },
        })
      );

    const result = await lookupPlayer("569296372", "10012");
    expect(result).toEqual({ nickname: "*GoPayUser*", country: "PH" });
  });

  it("falls back when Banana returns empty nickname", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          status: "success",
          result: { nickname: "", country: "ph" },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          message: "Success",
          data: { username: "*GoPayUser*", countryOrigin: "ph" },
        })
      );

    const result = await lookupPlayer("569296372", "10012");
    expect(result).toEqual({ nickname: "*GoPayUser*", country: "PH" });
  });

  it("falls back when GoPay message is not 'Success'", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock
      .mockRejectedValueOnce(new Error("banana"))
      .mockResolvedValueOnce(jsonResponse({ message: "Error" }))
      .mockResolvedValueOnce(
        jsonResponse({ success: true, name: "*IsanUser*", country: "id" })
      );

    const result = await lookupPlayer("569296372", "10012");
    expect(result).toEqual({ nickname: "*IsanUser*", country: "ID" });
  });

  it("decodes `+` as space in the nickname from upstream response", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        status: "success",
        result: { nickname: "*Foo+Bar*", country: "ph" },
      })
    );

    const result = await lookupPlayer("569296372", "10012");
    expect(result).toEqual({ nickname: "*Foo Bar*", country: "PH" });
  });
});

describe("lookupPlayer — concurrent upstreams", () => {
  it("completes with the healthy upstream while another one hangs", async () => {
    // Stub AbortSignal.timeout so we can fire the abort manually. Production
    // calls `AbortSignal.timeout(12_000)` internally — vitest's fake timers
    // don't intercept that timer (it lives in Node's internal timer API), so
    // we replace the factory itself with a controllable signal.
    const manualController = new AbortController();
    const originalTimeout = AbortSignal.timeout;
    AbortSignal.timeout = () => manualController.signal;

    try {
      const fetchMock = vi.mocked(globalThis.fetch);
      fetchMock.mockImplementationOnce(
        (_url: unknown, opts?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            opts?.signal?.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          })
      );
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          message: "Success",
          data: { username: "*GoPayUser*", countryOrigin: "ph" },
        })
      );

      const promise = lookupPlayer("569296372", "10012");

      // GoPay resolves before the abort fires; the hanging Banana fetch
      // does not delay the result.
      const result = await promise;
      expect(result).toEqual({ nickname: "*GoPayUser*", country: "PH" });
      expect(fetchMock).toHaveBeenCalledTimes(3);

      // Fire the abort that AbortSignal.timeout(12_000) would have fired.
      manualController.abort();
    } finally {
      AbortSignal.timeout = originalTimeout;
    }
  });
});
