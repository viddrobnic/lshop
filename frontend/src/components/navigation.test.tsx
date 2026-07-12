// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

import { apiFetch } from "@/api";
import { DesktopNavigation, MobileNavigation } from "./navigation";

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));

vi.mock("@/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api")>()),
  apiFetch: vi.fn(),
}));

vi.mock("@/providers/auth-provider", () => ({ useAuth: useAuthMock }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

function Location() {
  return <p>{useLocation().pathname}</p>;
}

function renderNavigation(component: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/stores"]}>
        {component}
        <Routes>
          <Route path="*" element={<Location />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return queryClient;
}

describe("navigation", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("marks the current desktop route and exposes an accessible account menu", async () => {
    useAuthMock.mockReturnValue({ user: { username: "alex" } });
    renderNavigation(<DesktopNavigation />);
    const user = userEvent.setup();

    expect(
      screen.getByRole("link", { name: "Stores" }).getAttribute("aria-current")
    ).toBe("page");
    await user.click(screen.getByRole("button", { name: "alex account menu" }));

    expect(screen.getByRole("menuitem", { name: "Logout" })).toBeTruthy();
  });

  it("logs out, refetches current user, and navigates to login", async () => {
    useAuthMock.mockReturnValue({ user: { username: "alex" } });
    vi.mocked(apiFetch).mockResolvedValue(null);
    const queryClient = renderNavigation(<MobileNavigation />);
    const refetchQueries = vi
      .spyOn(queryClient, "refetchQueries")
      .mockResolvedValue();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "alex account menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Logout" }));

    await waitFor(() => {
      expect(screen.getByText("/login")).toBeTruthy();
    });
    expect(apiFetch).toHaveBeenCalledWith("/auth/logout", { method: "POST" });
    expect(refetchQueries).toHaveBeenCalledWith({
      queryKey: ["auth", "me"],
      type: "all",
    });
  });
});
