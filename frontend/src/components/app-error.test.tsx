// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";

import { AppError } from "./app-error";

describe("AppError", () => {
  afterEach(cleanup);

  it("uses the supplied error message in an accessible alert", () => {
    render(<AppError error={new Error("Could not load stores")} />);

    expect(screen.getByRole("alert").textContent).toContain(
      "Could not load stores"
    );
  });
});
