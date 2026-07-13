import { describe, expect, it } from "vitest";
import type { Item, ItemList } from "@/data/items";
import {
  buildItemContainers,
  buildItemMap,
  findItemContainer,
  formatContainerId,
  getDropDestination,
  getItemMoveDestination,
  GLOBAL_UNASSIGNED_CONTAINER_ID,
  itemContainersEqual,
  moveItem,
  moveItemToTarget,
  parseContainerId,
  type ItemContainers,
} from "./item-containers";

const item = (id: number): Item => ({
  id,
  name: `Item ${String(id)}`,
  checked: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
});

const list: ItemList = {
  unassigned: [item(1)],
  stores: [
    {
      id: 10,
      name: "Market",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      unassigned: [item(2)],
      sections: [
        {
          id: 20,
          store_id: 10,
          name: "Produce",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
          items: [item(3)],
        },
        {
          id: 21,
          store_id: 10,
          name: "Bakery",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
          items: [],
        },
      ],
    },
    {
      id: 11,
      name: "Pharmacy",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      unassigned: [],
      sections: [],
    },
  ],
};

const containers = (): ItemContainers => ({
  "global-unassigned": [1, 2],
  "store-10-unassigned": [3, 4],
  "section-10-20": [5, 6],
  "section-11-30": [],
});

describe("item containers", () => {
  it("builds every hierarchy container, including empty containers", () => {
    expect(buildItemContainers(list)).toEqual({
      "global-unassigned": [1],
      "store-10-unassigned": [2],
      "section-10-20": [3],
      "section-10-21": [],
      "store-11-unassigned": [],
    });
  });

  it("builds an item lookup across every hierarchy level", () => {
    expect([...buildItemMap(list).keys()]).toEqual([1, 2, 3]);
  });

  it("formats and parses the exact container ID contract", () => {
    expect(formatContainerId({})).toBe(GLOBAL_UNASSIGNED_CONTAINER_ID);
    expect(formatContainerId({ storeId: 10 })).toBe("store-10-unassigned");
    expect(formatContainerId({ storeId: 10, sectionId: 20 })).toBe(
      "section-10-20"
    );
    expect(parseContainerId("global-unassigned")).toEqual({});
    expect(parseContainerId("store-10-unassigned")).toEqual({ storeId: 10 });
    expect(parseContainerId("section-10-20")).toEqual({
      storeId: 10,
      sectionId: 20,
    });
    expect(parseContainerId("section-10-x")).toBeNull();
    expect(parseContainerId("store-10-20")).toBeNull();
    expect(() => formatContainerId({ sectionId: 20 })).toThrow(
      "requires a store ID"
    );
  });

  it("finds an item container without confusing numeric IDs and string IDs", () => {
    expect(findItemContainer(containers(), 5)).toBe("section-10-20");
    expect(findItemContainer(containers(), 99)).toBeUndefined();
  });

  it("calculates final insertion positions for items and containers", () => {
    const state = containers();

    expect(getDropDestination(state, 1, 2)).toEqual({
      containerId: "global-unassigned",
      index: 1,
    });
    expect(getDropDestination(state, 1, "store-10-unassigned")).toEqual({
      containerId: "store-10-unassigned",
      index: 2,
    });
    expect(getDropDestination(state, 3, 4)).toEqual({
      containerId: "store-10-unassigned",
      index: 1,
    });
    expect(getDropDestination(state, 5, "section-11-30")).toEqual({
      containerId: "section-11-30",
      index: 0,
    });
    expect(getDropDestination(state, 99, 1)).toBeNull();
  });

  it("moves atomically between containers without mutating the prior state", () => {
    const state = containers();
    const next = moveItem(state, {
      itemId: 5,
      destinationContainerId: "store-10-unassigned",
      index: 1,
    });

    expect(next).toEqual({
      "global-unassigned": [1, 2],
      "store-10-unassigned": [3, 5, 4],
      "section-10-20": [6],
      "section-11-30": [],
    });
    expect(state["section-10-20"]).toEqual([5, 6]);
    expect(state["store-10-unassigned"]).toEqual([3, 4]);
  });

  it("reorders within a container and clamps out-of-range insertion indices", () => {
    expect(
      moveItem(containers(), {
        itemId: 1,
        destinationContainerId: "global-unassigned",
        index: 1,
      })["global-unassigned"]
    ).toEqual([2, 1]);

    expect(
      moveItem(containers(), {
        itemId: 6,
        destinationContainerId: "section-10-20",
        index: -10,
      })["section-10-20"]
    ).toEqual([6, 5]);
  });

  it("returns the original state for no-op and invalid moves", () => {
    const state = containers();

    expect(
      moveItem(state, {
        itemId: 1,
        destinationContainerId: "global-unassigned",
        index: 0,
      })
    ).toBe(state);
    expect(
      moveItem(state, {
        itemId: 99,
        destinationContainerId: "global-unassigned",
        index: 0,
      })
    ).toBe(state);
  });

  it("derives the backend destination and final zero-based index", () => {
    const next = moveItem(containers(), {
      itemId: 5,
      destinationContainerId: "section-11-30",
      index: 0,
    });

    expect(getItemMoveDestination(next, 5)).toEqual({
      storeId: 11,
      sectionId: 30,
      index: 0,
    });
    expect(getItemMoveDestination(next, 99)).toBeNull();
  });

  it("moves to a drag target and compares resulting container order", () => {
    const state = containers();
    const moved = moveItemToTarget(state, 5, "section-11-30");

    expect(moved["section-11-30"]).toEqual([5]);
    expect(itemContainersEqual(state, moved)).toBe(false);
    expect(itemContainersEqual(state, containers())).toBe(true);
  });
});
