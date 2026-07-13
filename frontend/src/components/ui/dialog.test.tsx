// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Dialog, DialogContent, DialogTitle } from "./dialog";

describe("DialogContent", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("stays centered in the visual viewport when the keyboard opens", async () => {
    const viewport = Object.assign(new EventTarget(), {
      height: 600,
      offsetLeft: 0,
      offsetTop: 0,
      width: 400,
    });
    vi.stubGlobal("visualViewport", viewport);

    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Add Item</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.style.top).toBe("300px");
    expect(dialog.style.maxHeight).toBe("568px");

    viewport.height = 300;
    viewport.dispatchEvent(new Event("resize"));

    await waitFor(() => {
      expect(dialog.style.top).toBe("150px");
      expect(dialog.style.maxHeight).toBe("268px");
    });
  });
});
