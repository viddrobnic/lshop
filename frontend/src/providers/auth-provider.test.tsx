// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router";

import { AuthProvider, useAuth } from "./auth-provider";
import { QueryProvider } from "./query-provider";

function AuthProbe() {
  const { isPending, user } = useAuth();
  return <p>{isPending ? "pending" : (user?.username ?? "guest")}</p>;
}

describe("AuthProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps an unauthorized current-user response to a settled guest", async () => {
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <BrowserRouter>
        <QueryProvider>
          <AuthProvider>
            <AuthProbe />
          </AuthProvider>
        </QueryProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("guest")).toBeTruthy();
    });
    const [input, init] = fetchMock.mock.calls[0] ?? [];
    expect(input).toBe("/api/auth/me");
    expect(init?.credentials).toBe("include");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
});
