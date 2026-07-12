import { describe, expect, it } from "vitest";

import { reorderSections, type Section } from "./stores";

const section = (id: number): Section => ({
  id,
  store_id: 1,
  name: `Section ${String(id)}`,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
});

describe("reorderSections", () => {
  it("moves the active section to the target position without mutation", () => {
    const sections = [section(1), section(2), section(3)];

    expect(reorderSections(sections, 3, 1).map(({ id }) => id)).toEqual([
      3, 1, 2,
    ]);
    expect(sections.map(({ id }) => id)).toEqual([1, 2, 3]);
  });

  it("preserves the original list for no-op and invalid targets", () => {
    const sections = [section(1), section(2)];

    expect(reorderSections(sections, 1, 1)).toBe(sections);
    expect(reorderSections(sections, 1, 3)).toBe(sections);
  });
});
