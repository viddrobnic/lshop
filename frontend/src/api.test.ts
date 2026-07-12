import { afterEach, describe, expect, it, vi } from "vitest";

import { apiFetch, UnauthorizedError } from "./api";

describe("apiFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefixes paths, includes cookies, and forwards request options", async () => {
    const signal = new AbortController().signal;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json; charset=utf-8" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiFetch("/items", {
        method: "POST",
        headers: { "x-request-id": "test" },
        body: "payload",
        signal,
      })
    ).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith("/api/items", {
      method: "POST",
      headers: { "x-request-id": "test" },
      body: "payload",
      signal,
      credentials: "include",
    });
  });

  it("returns null for successful non-JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    );

    await expect(
      apiFetch("/auth/logout", { method: "POST" })
    ).resolves.toBeNull();
  });

  it("throws dedicated errors for unauthorized and other failed responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(null, { status: 500, statusText: "Server Error" })
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/auth/me")).rejects.toBeInstanceOf(
      UnauthorizedError
    );
    await expect(apiFetch("/items")).rejects.toMatchObject({
      message: "HTTP 500: Server Error",
      status: 500,
    });
  });
});
