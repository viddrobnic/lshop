// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AddItemDialogProvider } from "./add-item-dialog";
import { useAddItemDialog } from "./add-item-dialog-context";

function Launcher() {
  const { open } = useAddItemDialog();
  return (
    <button
      onClick={() => {
        open({ store_id: 4, section_id: 9 });
      }}
    >
      add
    </button>
  );
}

describe("AddItemDialogProvider", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("captures its target and treats Enter as Create & Add Another", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AddItemDialogProvider>
          <Launcher />
        </AddItemDialogProvider>
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
});
