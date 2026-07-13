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
  const { check, uncheck, isPendingChecked, isCommittingChecked } =
    useItemChecker();
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
          check(2);
        }}
      >
        check 2
      </button>
      <button
        onClick={() => {
          uncheck(1);
        }}
      >
        uncheck
      </button>
      <button
        onClick={() => {
          uncheck(2);
        }}
      >
        uncheck 2
      </button>
      <span data-testid="item-1">
        {isPendingChecked(1) ? "pending" : "clear"}
      </span>
      <span data-testid="item-2">
        {isPendingChecked(2) ? "pending" : "clear"}
      </span>
      <span data-testid="committing-1">
        {isCommittingChecked(1) ? "committing" : "editable"}
      </span>
    </>
  );
}

function renderProbe() {
  const queryClient = new QueryClient();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ItemCheckerProvider>
        <Probe />
      </ItemCheckerProvider>
    </QueryClientProvider>
  );
  return { queryClient, view };
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
    renderProbe();
    fireEvent.click(screen.getByText("check"));
    fireEvent.click(screen.getByText("uncheck"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("item-1").textContent).toBe("clear");
  });

  it("submits pending checks together after the user stops interacting", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const { queryClient } = renderProbe();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    fireEvent.click(screen.getByText("check"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS - 500);
    });
    fireEvent.click(screen.getByText("check 2"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS - 500);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/items/1/checked",
      expect.objectContaining({ method: "PUT" })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/items/2/checked",
      expect.objectContaining({ method: "PUT" })
    );
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("restarts the batch delay when a pending check is undone", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    renderProbe();

    fireEvent.click(screen.getByText("check"));
    fireEvent.click(screen.getByText("check 2"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    fireEvent.click(screen.getByText("uncheck 2"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS - 1);
    });
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/items/1/checked",
      expect.anything()
    );
  });

  it("sends exactly one request for repeated checks", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    renderProbe();
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
    const { view } = renderProbe();
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
    expect(screen.getByTestId("item-1").textContent).toBe("pending");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS);
    });
    expect(screen.getByTestId("item-1").textContent).toBe("clear");
  });

  it("refreshes once and clears failed items after a partial batch failure", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const { queryClient } = renderProbe();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    fireEvent.click(screen.getByText("check"));
    fireEvent.click(screen.getByText("check 2"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("item-1").textContent).toBe("clear");
    expect(screen.getByTestId("item-2").textContent).toBe("clear");
  });

  it("does not undo a check after its batch starts submitting", async () => {
    vi.useFakeTimers();
    let resolveFetch: ((response: Response) => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          })
      )
    );
    renderProbe();
    fireEvent.click(screen.getByText("check"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS);
    });
    expect(screen.getByTestId("committing-1").textContent).toBe("committing");

    fireEvent.click(screen.getByText("uncheck"));
    expect(screen.getByTestId("item-1").textContent).toBe("pending");

    await act(async () => {
      resolveFetch?.(new Response(null, { status: 204 }));
      await Promise.resolve();
    });
    expect(screen.getByTestId("item-1").textContent).toBe("clear");
  });
});
