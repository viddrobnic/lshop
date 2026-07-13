// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogTitle,
} from "./responsive-dialog";

function setDesktop(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

describe("ResponsiveDialog", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders a drawer on mobile", () => {
    setDesktop(false);
    const { container } = render(
      <ResponsiveDialog open>
        <ResponsiveDialogContent>
          <ResponsiveDialogTitle>Title</ResponsiveDialogTitle>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    );

    expect(
      container.ownerDocument.querySelector('[data-slot="drawer-content"]')
    ).toBeTruthy();
  });

  it("renders a dialog on desktop", () => {
    setDesktop(true);
    const { container } = render(
      <ResponsiveDialog open>
        <ResponsiveDialogContent>
          <ResponsiveDialogTitle>Title</ResponsiveDialogTitle>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    );

    expect(
      container.ownerDocument.querySelector('[data-slot="dialog-content"]')
    ).toBeTruthy();
  });
});
