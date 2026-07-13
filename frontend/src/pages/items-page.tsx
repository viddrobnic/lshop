import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DragDropProvider,
  DragOverlay,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/react";
import { pointerIntersection } from "@dnd-kit/collision";
import {
  ChevronRightIcon,
  PackageIcon,
  PlusIcon,
  SparklesIcon,
  StoreIcon,
  CircleQuestionMarkIcon,
} from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Spinner } from "@/components/ui/spinner";
import { queryKeys } from "@/data/query-keys";
import {
  getTotal,
  getTotalStore,
  type Item,
  type ItemList,
  type ItemListStore,
} from "@/data/items";
import {
  AddItemDialog,
  type AddItemTarget,
} from "@/components/items/add-item-dialog";
import {
  buildItemContainers,
  buildItemMap,
  formatContainerId,
  formatStoreDropTargetId,
  getItemMoveDestination,
  itemContainersEqual,
  moveItemToTarget,
  type ContainerId,
  type ItemContainers,
} from "@/components/items/item-containers";

import { ItemCheckerProvider } from "@/components/items/item-checker-provider";
import { ItemOverlayRow, ItemRow } from "@/components/items/item-row";
import { cn } from "@/lib/utils";

function getContainerItems(
  containers: Partial<ItemContainers>,
  id: ContainerId
) {
  return containers[id] ?? [];
}

type OpenAddItem = (target: AddItemTarget) => void;

export default function ItemsPage() {
  const queryClient = useQueryClient();
  const itemsQuery = useQuery({
    queryKey: queryKeys.items,
    queryFn: () => apiFetch<ItemList>("/items"),
  });
  const [containers, setContainers] = useState<ItemContainers>({
    "global-unassigned": [],
  });
  const [addItemTarget, setAddItemTarget] = useState<AddItemTarget | null>(
    null
  );
  const containersRef = useRef(containers);
  const snapshotRef = useRef<ItemContainers | null>(null);
  const [activeItem, setActiveItem] = useState<Item | null>(null);
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
  });

  const updateContainers = (
    next: ItemContainers | ((current: ItemContainers) => ItemContainers)
  ) => {
    const resolved =
      typeof next === "function" ? next(containersRef.current) : next;
    containersRef.current = resolved;
    setContainers(resolved);
  };

  useEffect(() => {
    if (itemsQuery.data && !activeItem && !moveMutation.isPending)
      updateContainers(buildItemContainers(itemsQuery.data));
  }, [itemsQuery.data, activeItem, moveMutation.isPending]);

  const handleDragStart = ({ operation }: DragStartEvent) => {
    const itemId = operation.source?.id;
    if (typeof itemId !== "number" || moveMutation.isPending) return;
    const item = itemMap.get(itemId);
    if (!item) return;
    snapshotRef.current = containersRef.current;
    setActiveItem(item);
  };
  const handleDragOver = ({ operation }: DragOverEvent) => {
    const itemId = operation.source?.id;
    const targetId = operation.target?.id;
    if (typeof itemId !== "number" || targetId === undefined) return;
    updateContainers((current) => moveItemToTarget(current, itemId, targetId));
  };
  const handleDragEnd = ({ operation, canceled }: DragEndEvent) => {
    const itemId = operation.source?.id;
    const targetId = operation.target?.id;
    const snapshot = snapshotRef.current;
    snapshotRef.current = null;
    setActiveItem(null);
    if (
      typeof itemId !== "number" ||
      !snapshot ||
      canceled ||
      targetId === undefined
    ) {
      if (snapshot) updateContainers(snapshot);
      return;
    }
    // The current target may not have emitted dragover after the last pointer move.
    const finalContainers = moveItemToTarget(
      containersRef.current,
      itemId,
      targetId
    );
    updateContainers(finalContainers);
    if (itemContainersEqual(snapshot, finalContainers)) return;
    const destination = getItemMoveDestination(finalContainers, itemId);
    if (!destination) {
      updateContainers(snapshot);
      return;
    }
    moveMutation.mutate(
      { itemId, ...destination },
      {
        onError: () => {
          updateContainers(snapshot);
          toast.error("Failed to move item");
        },
      }
    );
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
  const total = getTotal(itemsQuery.data);

  return (
    <>
      <AddItemDialog
        target={addItemTarget}
        onClose={() => {
          setAddItemTarget(null);
        }}
      />
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
              onAddItem={setAddItemTarget}
            />
            {itemsQuery.data.stores.map((store) => (
              <StoreItems
                key={store.id}
                store={store}
                containers={containers}
                itemMap={itemMap}
                movePending={moveMutation.isPending}
                onAddItem={setAddItemTarget}
              />
            ))}
          </div>
          <DragOverlay className="z-50">
            {activeItem ? <ItemOverlayRow item={activeItem} inset={1} /> : null}
          </DragOverlay>
        </DragDropProvider>
      </ItemCheckerProvider>
    </>
  );
}

function StoreItems({
  store,
  containers,
  itemMap,
  movePending,
  onAddItem,
}: {
  store: ItemListStore;
  containers: ItemContainers;
  itemMap: Map<number, Item>;
  movePending: boolean;
  onAddItem: OpenAddItem;
}) {
  const queryClient = useQueryClient();
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
  const total = getTotalStore(store);
  const disabled = movePending || organize.isPending;
  const { ref: storeDropRef, isDropTarget } = useDroppable({
    id: formatStoreDropTargetId(store.id),
    disabled,
    collisionDetector: pointerIntersection,
  });
  return (
    <Collapsible>
      <div
        ref={storeDropRef}
        className={cn(
          "bg-background sticky top-0 z-30 flex h-14 items-center gap-3 px-3 transition-colors",
          isDropTarget && "bg-primary/10 ring-primary ring-2 ring-inset"
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="group flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-label={`Toggle ${store.name}`}
          >
            <ChevronRightIcon
              className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-90"
              aria-hidden="true"
            />
            <span className="bg-secondary/10 text-secondary-foreground flex size-7 shrink-0 items-center justify-center rounded-md">
              <StoreIcon className="size-4" />
            </span>
            <span className="text-secondary-foreground truncate text-lg font-bold tracking-tight">
              {store.name}
            </span>
            <Count value={total} />
          </button>
        </CollapsibleTrigger>
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
              onAddItem({ store_id: store.id });
            }}
            aria-label={`Add item to ${store.name}`}
          >
            <PlusIcon />
          </Button>
        </div>
      </div>
      <CollapsibleContent>
        <ItemContainer
          title="Unassigned"
          icon={<CircleQuestionMarkIcon className="size-3.5" />}
          containerId={formatContainerId({ storeId: store.id })}
          containers={containers}
          itemMap={itemMap}
          inset={2}
          headerClass="top-14 z-20 pl-7"
          disabled={disabled}
          onAddItem={onAddItem}
        />
        {store.sections.map((section) => (
          <ItemContainer
            key={section.id}
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
            addTarget={{
              store_id: section.store_id,
              section_id: section.id,
            }}
            onAddItem={onAddItem}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
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
  onAddItem,
}: {
  title: string;
  icon: ReactNode;
  containerId: ContainerId;
  containers: ItemContainers;
  itemMap: Map<number, Item>;
  inset: number;
  headerClass: string;
  disabled: boolean;
  addTarget?: AddItemTarget;
  onAddItem: OpenAddItem;
}) {
  // Containers establish the pointer's destination first; sortable rows then use closest-center within it.
  const { ref, isDropTarget } = useDroppable({
    id: containerId,
    disabled,
    collisionDetector: pointerIntersection,
  });
  const itemIds = getContainerItems(containers, containerId);
  return (
    <Collapsible asChild>
      <section ref={ref}>
        <div
          className={cn(
            "bg-background sticky flex items-center gap-3 py-3 pr-3 transition-colors",
            headerClass,
            inset === 1 && "pl-3",
            isDropTarget && "bg-primary/10 ring-primary ring-2 ring-inset"
          )}
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="group flex min-w-0 flex-1 items-center gap-3 text-left"
              aria-label={`Toggle ${title}`}
            >
              <ChevronRightIcon
                className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-90"
                aria-hidden="true"
              />
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
            </button>
          </CollapsibleTrigger>
          {addTarget ? (
            <Button
              size="icon-sm"
              variant="ghost"
              className="ml-auto"
              onClick={() => {
                onAddItem(addTarget);
              }}
              aria-label={`Add item to ${title}`}
            >
              <PlusIcon />
            </Button>
          ) : null}
        </div>
        <CollapsibleContent>
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
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

function Count({ value }: { value: number }) {
  return (
    <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-light">
      {value}
    </span>
  );
}
