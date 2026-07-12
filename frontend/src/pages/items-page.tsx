import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropProvider, DragOverlay, useDroppable } from "@dnd-kit/react";
import { pointerIntersection } from "@dnd-kit/collision";
import {
  PackageIcon,
  PlusIcon,
  SparklesIcon,
  StoreIcon,
  CircleQuestionMarkIcon,
} from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { queryKeys } from "@/data/query-keys";
import type {
  Item,
  ItemList,
  ItemListSection,
  ItemListStore,
} from "@/data/items";
import {
  buildItemContainers,
  buildItemMap,
  formatContainerId,
  getDropDestination,
  getItemMoveDestination,
  itemContainersReducer,
  type ContainerId,
  type ItemContainers,
} from "@/components/items/item-containers";

import { AddItemDialogProvider } from "@/components/items/add-item-dialog";
import { useAddItemDialog } from "@/components/items/add-item-dialog-context";
import { ItemCheckerProvider } from "@/components/items/item-checker-provider";
import { ItemOverlayRow, ItemRow } from "@/components/items/item-row";

function getContainerItems(
  containers: Partial<ItemContainers>,
  id: ContainerId
) {
  return containers[id] ?? [];
}

function sameContainers(a: ItemContainers, b: ItemContainers) {
  const aKeys = Object.keys(a);
  return (
    aKeys.length === Object.keys(b).length &&
    aKeys.every((key) => {
      const containerId = key as ContainerId;
      return (
        a[containerId].every((id, index) => id === b[containerId][index]) &&
        a[containerId].length === b[containerId].length
      );
    })
  );
}

export function ItemsPage() {
  const queryClient = useQueryClient();
  const itemsQuery = useQuery({
    queryKey: queryKeys.items,
    queryFn: () => apiFetch<ItemList>("/items"),
  });
  const [containers, setContainers] = useState<ItemContainers>({
    "global-unassigned": [],
  });
  const containersRef = useRef(containers);
  const snapshotRef = useRef<ItemContainers | null>(null);
  const activeItemRef = useRef<number | null>(null);
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const itemMap = itemsQuery.data
    ? buildItemMap(itemsQuery.data)
    : new Map<number, Item>();

  const moveMutation = useMutation({
    mutationFn: ({
      itemId,
      storeId,
      sectionId,
      index,
    }: {
      itemId: number;
      storeId?: number;
      sectionId?: number;
      index: number;
    }) =>
      apiFetch(`/items/${String(itemId)}/move`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: storeId,
          section_id: sectionId,
          index,
        }),
      }),
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.items });
    },
    onError: () => {
      if (itemsQuery.data)
        updateContainers(buildItemContainers(itemsQuery.data));
      toast.error("Failed to move item");
    },
  });

  const updateContainers = (
    next: ItemContainers | ((current: ItemContainers) => ItemContainers)
  ) => {
    setContainers((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      containersRef.current = resolved;
      return resolved;
    });
  };

  useEffect(() => {
    if (itemsQuery.data && !isDragging && !moveMutation.isPending)
      updateContainers(buildItemContainers(itemsQuery.data));
  }, [itemsQuery.data, isDragging, moveMutation.isPending]);

  const handleDragStart = ({
    operation,
  }: {
    operation: { source: { id: string | number } | null };
  }) => {
    const sourceId = operation.source?.id;
    const itemId = typeof sourceId === "string" ? Number(sourceId) : sourceId;
    if (
      itemId === undefined ||
      !Number.isInteger(itemId) ||
      moveMutation.isPending
    )
      return;
    snapshotRef.current = containersRef.current;
    activeItemRef.current = itemId;
    setActiveItem(itemMap.get(itemId) ?? null);
    setIsDragging(true);
  };
  const movedToTarget = (
    current: ItemContainers,
    sourceId: number,
    targetId: string | number
  ) => {
    const destination = getDropDestination(
      current,
      sourceId,
      typeof targetId === "string" ? (targetId as ContainerId) : targetId
    );
    if (!destination) return current;
    return itemContainersReducer(current, {
      type: "move-item",
      itemId: sourceId,
      destinationContainerId: destination.containerId,
      index: destination.index,
    });
  };
  const moveToTarget = (sourceId: number, targetId: string | number) => {
    updateContainers((current) => movedToTarget(current, sourceId, targetId));
  };
  const handleDragOver = ({
    operation,
  }: {
    operation: {
      source: { id: string | number } | null;
      target: { id: string | number } | null;
    };
  }) => {
    const source = operation.source?.id;
    const target = operation.target?.id;
    if (
      source !== undefined &&
      target !== undefined &&
      typeof source === "number"
    )
      moveToTarget(source, target);
  };
  const handleDragEnd = ({
    operation,
    canceled,
  }: {
    operation: {
      source: { id: string | number } | null;
      target: { id: string | number } | null;
    };
    canceled: boolean;
  }) => {
    const itemId = activeItemRef.current;
    const snapshot = snapshotRef.current;
    activeItemRef.current = null;
    snapshotRef.current = null;
    setActiveItem(null);
    setIsDragging(false);
    if (!itemId || !snapshot || canceled || !operation.target) {
      if (snapshot) updateContainers(snapshot);
      return;
    }
    // The current target may not have emitted dragover after the last pointer move.
    const finalContainers = movedToTarget(
      containersRef.current,
      itemId,
      operation.target.id
    );
    if (finalContainers !== containersRef.current)
      updateContainers(finalContainers);
    if (sameContainers(snapshot, finalContainers)) return;
    const destination = getItemMoveDestination(finalContainers, itemId);
    if (!destination) {
      updateContainers(snapshot);
      return;
    }
    moveMutation.mutate({ itemId, ...destination });
  };

  if (itemsQuery.isPending)
    return (
      <p className="text-muted-foreground flex items-center gap-3 px-4 pt-4 text-sm">
        <Spinner />
        Loading...
      </p>
    );
  if (itemsQuery.isError || !itemsQuery.data)
    return (
      <p className="px-4 pt-4 text-sm">
        Error: {itemsQuery.error?.message ?? "Unable to load items"}
      </p>
    );
  const total = Object.values(containers).reduce(
    (count, ids) => count + ids.length,
    0
  );

  return (
    <AddItemDialogProvider>
      <ItemCheckerProvider>
        <div className="flex items-center px-4">
          <h1 className="text-primary text-3xl font-bold">Items</h1>
        </div>
        <div className="px-4 text-sm">{total} total items</div>
        <DragDropProvider
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="pt-4 pb-14 sm:pb-4">
            <ItemContainer
              title="Unassigned"
              icon={<CircleQuestionMarkIcon className="size-4" />}
              containerId="global-unassigned"
              containers={containers}
              itemMap={itemMap}
              inset={1}
              headerClass="top-0 z-30"
              disabled={moveMutation.isPending}
              addTarget={{}}
            />
            {itemsQuery.data.stores.map((store) => (
              <StoreItems
                key={store.id}
                store={store}
                containers={containers}
                itemMap={itemMap}
                movePending={moveMutation.isPending}
              />
            ))}
          </div>
          <DragOverlay className="z-50">
            {activeItem ? <ItemOverlayRow item={activeItem} inset={1} /> : null}
          </DragOverlay>
        </DragDropProvider>
      </ItemCheckerProvider>
    </AddItemDialogProvider>
  );
}

function StoreItems({
  store,
  containers,
  itemMap,
  movePending,
}: {
  store: ItemListStore;
  containers: ItemContainers;
  itemMap: Map<number, Item>;
  movePending: boolean;
}) {
  const queryClient = useQueryClient();
  const { open } = useAddItemDialog();
  const organize = useMutation({
    mutationFn: () =>
      apiFetch(`/stores/${String(store.id)}/organize`, { method: "POST" }),
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.items });
    },
    onError: () => {
      toast.error("Failed to sort items");
    },
  });
  const total = [
    formatContainerId({ storeId: store.id }),
    ...store.sections.map((section) =>
      formatContainerId({ storeId: store.id, sectionId: section.id })
    ),
  ].reduce((count, id) => count + getContainerItems(containers, id).length, 0);
  const disabled = movePending || organize.isPending;
  return (
    <>
      <div className="bg-background sticky top-0 z-30 flex items-center gap-3 px-3 py-3">
        <span className="bg-secondary/10 text-secondary flex size-7 items-center justify-center rounded-md">
          <StoreIcon className="size-4" />
        </span>
        <span className="text-secondary truncate text-lg font-bold tracking-tight">
          {store.name}
        </span>
        <Count value={total} />
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => {
              organize.mutate();
            }}
          >
            {organize.isPending ? <Spinner /> : <SparklesIcon />}{" "}
            {organize.isPending ? "Sorting" : "Sort"}
          </Button>
          <Button
            size="icon-sm"
            variant="secondary"
            onClick={() => {
              open({ store_id: store.id });
            }}
            aria-label={`Add item to ${store.name}`}
          >
            <PlusIcon />
          </Button>
        </div>
      </div>
      <ItemContainer
        title="Unassigned"
        icon={<CircleQuestionMarkIcon className="size-3.5" />}
        containerId={formatContainerId({ storeId: store.id })}
        containers={containers}
        itemMap={itemMap}
        inset={2}
        headerClass="top-14 z-20 pl-7"
        disabled={disabled}
      />
      {store.sections.map((section) => (
        <SectionItems
          key={section.id}
          section={section}
          containers={containers}
          itemMap={itemMap}
          disabled={disabled}
        />
      ))}
    </>
  );
}

function SectionItems({
  section,
  containers,
  itemMap,
  disabled,
}: {
  section: ItemListSection;
  containers: ItemContainers;
  itemMap: Map<number, Item>;
  disabled: boolean;
}) {
  return (
    <ItemContainer
      title={section.name}
      icon={<PackageIcon className="size-3.5" />}
      containerId={formatContainerId({
        storeId: section.store_id,
        sectionId: section.id,
      })}
      containers={containers}
      itemMap={itemMap}
      inset={2}
      headerClass="top-14 z-20 pl-7"
      disabled={disabled}
      addTarget={{ store_id: section.store_id, section_id: section.id }}
    />
  );
}

function ItemContainer({
  title,
  icon,
  containerId,
  containers,
  itemMap,
  inset,
  headerClass,
  disabled,
  addTarget,
}: {
  title: string;
  icon: ReactNode;
  containerId: ContainerId;
  containers: ItemContainers;
  itemMap: Map<number, Item>;
  inset: number;
  headerClass: string;
  disabled: boolean;
  addTarget?: { store_id?: number; section_id?: number };
}) {
  // Containers establish the pointer's destination first; sortable rows then use closest-center within it.
  const { ref, isDropTarget } = useDroppable({
    id: containerId,
    disabled,
    collisionDetector: pointerIntersection,
  });
  const { open } = useAddItemDialog();
  const itemIds = getContainerItems(containers, containerId);
  return (
    <section ref={ref} className={isDropTarget ? "bg-primary/5" : undefined}>
      <div
        className={`bg-background sticky mb-px flex items-center gap-3 py-3 pr-3 ${headerClass} ${inset === 1 ? "pl-3" : ""}`}
      >
        <span className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-md">
          {icon}
        </span>
        <span
          className={
            inset === 1
              ? "text-muted-foreground text-lg font-bold tracking-tight"
              : "text-muted-foreground font-semibold tracking-tight"
          }
        >
          {title}
        </span>
        <Count value={itemIds.length} />
        {addTarget ? (
          <Button
            size="icon-sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => {
              open(addTarget);
            }}
            aria-label={`Add item to ${title}`}
          >
            <PlusIcon />
          </Button>
        ) : null}
      </div>
      {itemIds.map((id, index) => {
        const item = itemMap.get(id);
        return item ? (
          <ItemRow
            key={id}
            item={item}
            index={index}
            containerId={containerId}
            inset={inset}
            disabled={disabled}
          />
        ) : null;
      })}
    </section>
  );
}

function Count({ value }: { value: number }) {
  return (
    <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-light">
      {value}
    </span>
  );
}

export default ItemsPage;
