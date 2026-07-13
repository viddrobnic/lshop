import type { Item, ItemList } from "@/data/items";

export const GLOBAL_UNASSIGNED_CONTAINER_ID = "global-unassigned";

export type ContainerId =
  | typeof GLOBAL_UNASSIGNED_CONTAINER_ID
  | `store-${number}-unassigned`
  | `section-${number}-${number}`;

export type ItemContainers = Record<ContainerId, number[]>;

export type ContainerTarget = {
  storeId?: number;
  sectionId?: number;
};

export type ItemMoveDestination = ContainerTarget & {
  index: number;
};

type MoveItem = {
  itemId: number;
  destinationContainerId: ContainerId;
  index: number;
};

export function formatContainerId({
  storeId,
  sectionId,
}: ContainerTarget): ContainerId {
  if (sectionId !== undefined) {
    if (storeId === undefined) {
      throw new Error("A section container requires a store ID");
    }
    return ["section", storeId, sectionId].join("-") as ContainerId;
  }

  if (storeId !== undefined) {
    return ["store", storeId, "unassigned"].join("-") as ContainerId;
  }

  return GLOBAL_UNASSIGNED_CONTAINER_ID;
}

export function parseContainerId(containerId: string): ContainerTarget | null {
  if (containerId === GLOBAL_UNASSIGNED_CONTAINER_ID) {
    return {};
  }

  const sectionMatch = /^section-(\d+)-(\d+)$/.exec(containerId);
  if (sectionMatch) {
    return {
      storeId: Number(sectionMatch[1]),
      sectionId: Number(sectionMatch[2]),
    };
  }

  const storeMatch = /^store-(\d+)-unassigned$/.exec(containerId);
  if (storeMatch) {
    return { storeId: Number(storeMatch[1]) };
  }

  return null;
}

export function buildItemContainers(list: ItemList): ItemContainers {
  const containers = {} as ItemContainers;
  containers[GLOBAL_UNASSIGNED_CONTAINER_ID] = list.unassigned.map(
    (item) => item.id
  );

  for (const store of list.stores) {
    containers[formatContainerId({ storeId: store.id })] = store.unassigned.map(
      (item) => item.id
    );

    for (const section of store.sections) {
      containers[
        formatContainerId({ storeId: store.id, sectionId: section.id })
      ] = section.items.map((item) => item.id);
    }
  }

  return containers;
}

export function buildItemMap(list: ItemList): Map<number, Item> {
  const items = new Map<number, Item>();

  for (const item of list.unassigned) {
    items.set(item.id, item);
  }
  for (const store of list.stores) {
    for (const item of store.unassigned) {
      items.set(item.id, item);
    }
    for (const section of store.sections) {
      for (const item of section.items) {
        items.set(item.id, item);
      }
    }
  }

  return items;
}

export function findItemContainer(
  containers: ItemContainers,
  itemId: number
): ContainerId | undefined {
  return (Object.keys(containers) as ContainerId[]).find((containerId) =>
    containers[containerId].includes(itemId)
  );
}

export function getDropDestination(
  containers: ItemContainers,
  itemId: number,
  overId: ContainerId | number
): { containerId: ContainerId; index: number } | null {
  const sourceContainerId = findItemContainer(containers, itemId);
  if (!sourceContainerId) {
    return null;
  }

  const destinationContainerId =
    typeof overId === "string" ? overId : findItemContainer(containers, overId);
  if (!destinationContainerId) {
    return null;
  }

  const destinationItems = containers[destinationContainerId];
  const overIndex =
    typeof overId === "string"
      ? destinationItems.length
      : destinationItems.indexOf(overId);
  if (overIndex === -1) {
    return null;
  }

  // The reducer receives the item's intended final position, like sortable APIs do.
  return { containerId: destinationContainerId, index: overIndex };
}

export function moveItem(
  containers: ItemContainers,
  move: MoveItem
): ItemContainers {
  const sourceContainerId = findItemContainer(containers, move.itemId);
  const destinationItems = containers[move.destinationContainerId];
  if (!sourceContainerId) {
    return containers;
  }

  const sourceItems = containers[sourceContainerId];
  const sourceIndex = sourceItems.indexOf(move.itemId);
  const sourceWithoutItem = sourceItems.filter(
    (itemId) => itemId !== move.itemId
  );
  const insertionItems =
    sourceContainerId === move.destinationContainerId
      ? sourceWithoutItem
      : destinationItems;
  const index = Math.max(0, Math.min(move.index, insertionItems.length));

  if (
    sourceContainerId === move.destinationContainerId &&
    sourceIndex === index
  ) {
    return containers;
  }

  const nextDestination = [
    ...insertionItems.slice(0, index),
    move.itemId,
    ...insertionItems.slice(index),
  ];

  if (sourceContainerId === move.destinationContainerId) {
    return { ...containers, [sourceContainerId]: nextDestination };
  }

  return {
    ...containers,
    [sourceContainerId]: sourceWithoutItem,
    [move.destinationContainerId]: nextDestination,
  };
}

export function moveItemToTarget(
  containers: ItemContainers,
  itemId: number,
  targetId: string | number
) {
  const destination = getDropDestination(
    containers,
    itemId,
    typeof targetId === "string" ? (targetId as ContainerId) : targetId
  );
  return destination
    ? moveItem(containers, {
        itemId,
        destinationContainerId: destination.containerId,
        index: destination.index,
      })
    : containers;
}

export function itemContainersEqual(a: ItemContainers, b: ItemContainers) {
  const containerIds = Object.keys(a) as ContainerId[];
  return (
    containerIds.length === Object.keys(b).length &&
    containerIds.every(
      (id) =>
        a[id].length === b[id].length &&
        a[id].every((itemId, index) => itemId === b[id][index])
    )
  );
}

export function getItemMoveDestination(
  containers: ItemContainers,
  itemId: number
): ItemMoveDestination | null {
  const containerId = findItemContainer(containers, itemId);
  if (!containerId) {
    return null;
  }

  const target = parseContainerId(containerId);
  if (!target) {
    return null;
  }

  return {
    ...target,
    index: containers[containerId].indexOf(itemId),
  };
}
