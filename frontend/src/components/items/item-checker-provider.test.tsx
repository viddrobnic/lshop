// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ItemCheckerProvider } from "./item-checker-provider";
import { CHECK_DELAY_MS, useItemChecker } from "./item-checker-context";

function Probe() {
  const { check, uncheck, isPendingChecked } = useItemChecker();
  return (
    <>
      <button
        onClick={() => {
          check(1);
        }}
      >
        check
      </button>
      <button
        onClick={() => {
          uncheck(1);
        }}
      >
        uncheck
      </button>
      <span>{isPendingChecked(1) ? "pending" : "clear"}</span>
    </>
  );
}

function renderProbe() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ItemCheckerProvider>
        <Probe />
      </ItemCheckerProvider>
    </QueryClientProvider>
  );
}

describe("ItemCheckerProvider", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("cancels a delayed check before it reaches the server", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    void renderProbe();
    fireEvent.click(screen.getByText("check"));
    fireEvent.click(screen.getByText("uncheck"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("clear")).toBeTruthy();
  });

  it("sends exactly one request for repeated checks", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    void renderProbe();
    fireEvent.click(screen.getByText("check"));
    fireEvent.click(screen.getByText("check"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/items/1/checked",
      expect.objectContaining({ method: "PUT", credentials: "include" })
    );
  });

  it("clears scheduled checks on unmount", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const view = renderProbe();
    fireEvent.click(screen.getByText("check"));
    view.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears the pending appearance when the delayed request fails", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    renderProbe();
    fireEvent.click(screen.getByText("check"));
    expect(screen.getByText("pending")).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS);
    });
    expect(screen.getByText("clear")).toBeTruthy();
  });
});
