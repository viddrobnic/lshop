// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

import { ApiError, UnauthorizedError, apiFetch } from "@/api";
import LoginPage from "./login-page";

vi.mock("@/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api")>()),
  apiFetch: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({ isPending: false, user: null }),
}));

function Location() {
  return <p>{useLocation().pathname}</p>;
}

function renderLogin(
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
) {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Location />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return queryClient;
}

describe("LoginPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("posts web credentials, refetches the user, and navigates home", async () => {
    const fetchMock = vi.mocked(apiFetch).mockResolvedValue(null);
    const queryClient = renderLogin();
    const refetchQueries = vi
      .spyOn(queryClient, "refetchQueries")
      .mockResolvedValue();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Username"), "alex");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(screen.getByText("/")).toBeTruthy();
    });
    expect(fetchMock).toHaveBeenCalledWith("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "alex",
        password: "secret",
        auth_type: "web",
      }),
    });
    expect(refetchQueries).toHaveBeenCalledWith({
      queryKey: ["auth", "me"],
      type: "all",
    });
  });

  it("shows invalid credentials inline", async () => {
    vi.mocked(apiFetch).mockRejectedValue(new UnauthorizedError());
    renderLogin();

    const form = screen.getByRole("button", { name: "Login" }).closest("form");
    if (!form) {
      throw new Error("Login form was not rendered");
    }
    fireEvent.submit(form, {
      target: { username: { value: "alex" }, password: { value: "wrong" } },
    });

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Invalid credentials"
    );
  });

  it("uses a generic inline error for non-authentication failures", async () => {
    vi.mocked(apiFetch).mockRejectedValue(
      new ApiError("Service unavailable", 503)
    );
    renderLogin();

    const form = screen.getByRole("button", { name: "Login" }).closest("form");
    if (!form) {
      throw new Error("Login form was not rendered");
    }
    fireEvent.submit(form, {
      target: { username: { value: "alex" }, password: { value: "wrong" } },
    });

    expect((await screen.findByRole("alert")).textContent).toContain(
      "An unknown error occurred"
    );
  });
});
