// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";

import { AddItemDialog, type AddItemTarget } from "./add-item-dialog";

function AddItemDialogHarness() {
  const [target, setTarget] = useState<AddItemTarget | null>(null);
  return (
    <>
      <button
        onClick={() => {
          setTarget({ store_id: 4, section_id: 9 });
        }}
      >
        add
      </button>
      <AddItemDialog
        target={target}
        onClose={() => {
          setTarget(null);
        }}
      />
    </>
  );
}

const pointerCaptureDescriptors = Object.fromEntries(
  ["hasPointerCapture", "releasePointerCapture", "setPointerCapture"].map(
    (name) => [
      name,
      Object.getOwnPropertyDescriptor(HTMLElement.prototype, name) ?? {
        configurable: true,
        value: undefined,
      },
    ]
  )
);

describe("AddItemDialog", () => {
  beforeEach(() => {
    Object.defineProperties(HTMLElement.prototype, {
      hasPointerCapture: { configurable: true, value: vi.fn(() => false) },
      releasePointerCapture: { configurable: true, value: vi.fn() },
      setPointerCapture: { configurable: true, value: vi.fn() },
    });
  });

  afterEach(() => {
    cleanup();
    Object.defineProperties(HTMLElement.prototype, pointerCaptureDescriptors);
    vi.unstubAllGlobals();
  });

  it("captures its target and treats Enter as Create & Add Another", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AddItemDialogHarness />
      </QueryClientProvider>
    );
    fireEvent.click(screen.getByText("add"));
    const input = await screen.findByLabelText("Name");
    fireEvent.change(input, { target: { value: "Milk" } });
    const form = input.closest("form");
    if (!form) throw new Error("Expected add-item form");
    fireEvent.submit(form);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/items",
        expect.objectContaining({ method: "POST", credentials: "include" })
      );
    });
    const request = fetchMock.mock.calls[0]?.[1];
    const body = request?.body;
    if (typeof body !== "string") throw new Error("Expected JSON request body");
    expect(JSON.parse(body)).toEqual({
      name: "Milk",
      store_id: 4,
      section_id: 9,
    });
    expect(screen.getByLabelText("Name")).toBeTruthy();
    expect(screen.getByLabelText<HTMLInputElement>("Name").value).toBe("");
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Bread" },
    });
    fireEvent.click(screen.getByText("Create", { selector: "button" }));
    await waitFor(() => {
      expect(screen.queryByLabelText("Name")).toBeNull();
    });
  });

  it("keeps the name input focused while adding another item", async () => {
    let resolveRequest!: (response: Response) => void;
    const request = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockReturnValue(request));
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={new QueryClient()}>
        <AddItemDialogHarness />
      </QueryClientProvider>
    );

    await user.click(screen.getByText("add"));
    const input = await screen.findByLabelText<HTMLInputElement>("Name");
    await user.type(input, "Milk");
    await user.click(
      screen.getByRole("button", { name: "Create & Add Another" })
    );

    expect(document.activeElement).toBe(input);
    resolveRequest(new Response(null, { status: 204 }));
    await waitFor(() => {
      expect(input.value).toBe("");
    });
    expect(document.activeElement).toBe(input);
  });
});
