// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { BrowserRouter, useLocation } from "react-router";

vi.mock("./pages/items-page", () => ({ default: () => <h1>Items</h1> }));
vi.mock("./pages/stores-page", () => ({ default: () => <h1>Stores</h1> }));

import { apiFetch } from "./api";
import { App } from "./app";
import { AuthProvider, useAuth } from "./providers/auth-provider";
import { QueryProvider } from "./providers/query-provider";

function renderAt(pathname: string, response: Response) {
  window.history.replaceState({}, "", pathname);
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

describe("routes", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("redirects a guest from protected routes to login", async () => {
    renderAt("/stores", new Response(null, { status: 401 }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Login" })).toBeTruthy();
    });
  });

  it("redirects an authenticated visitor away from login without rendering it", async () => {
    renderAt(
      "/login",
      new Response(
        JSON.stringify({
          id: 1,
          username: "sam",
          created_at: "",
          updated_at: "",
        }),
        { headers: { "content-type": "application/json" } }
      )
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Items" })).toBeTruthy();
    });
    expect(screen.queryByRole("heading", { name: "Login" })).toBeNull();
  });

  it("renders the wildcard page without requiring authentication", () => {
    renderAt("/missing", new Response(null, { status: 401 }));

    expect(
      screen.getByRole("heading", { name: "404: Not Found" })
    ).toBeTruthy();
  });

  it("redirects to login when a protected query receives a 401", async () => {
    window.history.replaceState({}, "", "/");
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string) => {
        if (input === "/api/auth/me") {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                id: 1,
                username: "sam",
                created_at: "",
                updated_at: "",
              }),
              {
                headers: { "content-type": "application/json" },
              }
            )
          );
        }

        return Promise.resolve(new Response(null, { status: 401 }));
      })
    );
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );

    function ProtectedRequest() {
      const { user } = useAuth();
      useQuery({
        queryKey: ["protected"],
        queryFn: () => apiFetch("/items"),
        enabled: Boolean(user),
        retry: false,
      });
      return <p>{useLocation().pathname}</p>;
    }

    render(
      <BrowserRouter>
        <QueryProvider>
          <AuthProvider>
            <ProtectedRequest />
          </AuthProvider>
        </QueryProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("/login")).toBeTruthy();
    });
  });
});
