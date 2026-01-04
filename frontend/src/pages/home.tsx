import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query";
import { apiFetch } from "../api";
import {
  createMemo,
  Show,
  Switch,
  Match,
  For,
  createSignal,
  createEffect,
  batch,
  createContext,
  useContext,
  ParentProps,
  Accessor,
} from "solid-js";
import {
  type Item,
  type ItemList,
  ItemListSection,
  type ItemListStore,
  getTotal,
} from "../data/items";
import {
  CircleQuestionMarkIcon,
  PackageIcon,
  SparklesIcon,
  StoreIcon,
} from "lucide-solid";
import { cn } from "../lib/utils";
import AddItem from "../components/items/add-item";
import {
  DragDropProvider,
  DragDropSensors,
  DragOverlay,
  SortableProvider,
  createDroppable,
  closestCenter,
  Draggable,
  Droppable,
  Id,
  CollisionDetector,
  mostIntersecting,
} from "@thisbeyond/solid-dnd";
import { createStore } from "solid-js/store";
import SortableItem from "../components/items/sortable-item";
import { ItemsCheckerProvider } from "../components/items/item-checker";

// Context for containers and itemMap
type ItemsContextValue = {
  containers: Accessor<Record<string, number[]>>;
  itemMap: Accessor<Map<number, Item>>;
};

const ItemsContext = createContext<ItemsContextValue>();

const useItemsContext = () => {
  const context = useContext(ItemsContext);
  if (!context) {
    throw new Error("useItemsContext must be used within ItemsProvider");
  }
  return context;
};

function ItemsProvider(
  props: ParentProps<{
    containers: Record<string, number[]>;
    itemMap: Accessor<Map<number, Item>>;
  }>
) {
  return (
    <ItemsContext.Provider
      value={{
        containers: () => props.containers,
        itemMap: () => props.itemMap(),
      }}
    >
      {props.children}
    </ItemsContext.Provider>
  );
}

// Container ID helper
const getContainerId = (
  storeId: number | undefined,
  sectionId: number | undefined
) => {
  if (sectionId !== undefined && storeId !== undefined) {
    return `section-${storeId}-${sectionId}`;
  }
  if (storeId !== undefined) {
    return `store-${storeId}-unassigned`;
  }
  return "global-unassigned";
};

const parseContainerId = (containerId: string) => {
  if (containerId === "global-unassigned") {
    return { storeId: undefined, sectionId: undefined };
  }

  const sectionMatch = containerId.match(/^section-(\d+)-(\d+)$/);
  if (sectionMatch) {
    return {
      storeId: parseInt(sectionMatch[1], 10),
      sectionId: parseInt(sectionMatch[2], 10),
    };
  }

  const storeMatch = containerId.match(/^store-(\d+)-unassigned$/);
  if (storeMatch) {
    return { storeId: parseInt(storeMatch[1], 10), sectionId: undefined };
  }

  return { storeId: undefined, sectionId: undefined };
};

export default function Home() {
  const data = useQuery(() => ({
    queryKey: ["items"],
    queryFn: async () => apiFetch<ItemList>("/items"),
  }));

  const total = createMemo((): number | undefined => {
    if (data.data) {
      return getTotal(data.data);
    } else {
      return undefined;
    }
  });

  const queryClient = useQueryClient();
  const moveMutation = useMutation(() => ({
    mutationFn: async ({
      id,
      storeId,
      sectionId,
      index,
    }: {
      id: number;
      storeId?: number;
      sectionId?: number;
      index: number;
    }) =>
      apiFetch(`/items/${id}/move`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: storeId,
          section_id: sectionId,
          index,
        }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["items"],
      });
    },
  }));

  // From here on out thre is a lot of drag and drop logic. Bare with it...

  // Build containers map: containerId -> item IDs
  const buildContainers = () => {
    if (!data.data) return {};

    const containers: Record<string, number[]> = {};

    // Global unassigned
    containers[getContainerId(undefined, undefined)] = data.data.unassigned.map(
      (item) => item.id
    );

    // Stores
    for (const store of data.data.stores) {
      // Store unassigned
      containers[getContainerId(store.id, undefined)] = store.unassigned.map(
        (item) => item.id
      );

      // Store sections
      for (const section of store.sections) {
        containers[getContainerId(store.id, section.id)] = section.items.map(
          (item) => item.id
        );
      }
    }

    return containers;
  };

  const [containers, setContainers] = createStore<Record<string, number[]>>({});

  // Initialize containers from data
  createEffect(() => {
    setContainers(buildContainers());
  });

  const containerIds = () => Object.keys(containers);

  // Is item with given id a container
  const isContainer = (id: Id) => containerIds().includes(String(id));

  // Get container id of the item with given id
  const getContainer = (id: Id) => {
    for (const [key, items] of Object.entries(containers)) {
      if (items.includes(Number(id))) {
        return key;
      }
    }
  };

  // Item map for quick lookup
  const itemMap = createMemo(() => {
    if (!data.data) return new Map<number, Item>();

    const map = new Map<number, Item>();
    for (const item of data.data.unassigned) {
      map.set(item.id, item);
    }
    for (const store of data.data.stores) {
      for (const item of store.unassigned) {
        map.set(item.id, item);
      }
      for (const section of store.sections) {
        for (const item of section.items) {
          map.set(item.id, item);
        }
      }
    }
    return map;
  });

  const [activeItem, setActiveItem] = createSignal<Item | null>(null);

  const closestContainerOrItem: CollisionDetector = (
    draggable,
    droppables,
    context
  ) => {
    const closestContainer = mostIntersecting(
      draggable,
      droppables.filter((droppable) => isContainer(droppable.id)),
      context
    );

    if (!closestContainer) {
      return null;
    }

    const containerItemIds = containers[String(closestContainer.id)] || [];
    const closestItem = closestCenter(
      draggable,
      droppables.filter((droppable) =>
        containerItemIds.includes(Number(droppable.id))
      ),
      context
    );

    if (!closestItem) {
      return closestContainer;
    }

    if (getContainer(draggable.id) !== closestContainer.id) {
      const isLastItem =
        containerItemIds.indexOf(Number(closestItem.id)) ===
        containerItemIds.length - 1;

      if (isLastItem) {
        const belowLastItem =
          draggable.transformed.center.y > closestItem.transformed.center.y;

        if (belowLastItem) {
          return closestContainer;
        }
      }
    }
    return closestItem;
  };

  const move = (
    draggable: Draggable,
    droppable: Droppable,
    onlyWhenChangingContainer = true
  ) => {
    const draggableContainer = getContainer(draggable.id);
    const droppableContainer = isContainer(droppable.id)
      ? String(droppable.id)
      : getContainer(droppable.id);

    if (
      draggableContainer !== droppableContainer ||
      !onlyWhenChangingContainer
    ) {
      const containerItemIds = containers[droppableContainer!] || [];
      let index = containerItemIds.indexOf(Number(droppable.id));
      if (index === -1) index = containerItemIds.length;

      batch(() => {
        setContainers(draggableContainer!, (items) =>
          items.filter((item) => item !== Number(draggable.id))
        );
        setContainers(droppableContainer!, (items) => [
          ...items.slice(0, index),
          Number(draggable.id),
          ...items.slice(index),
        ]);
      });
    }
  };

  const onDragStart = ({ draggable }: { draggable: Draggable }) => {
    const itemId = Number(draggable.id);
    const item = itemMap().get(itemId);
    setActiveItem(item ?? null);
  };

  const onDragOver = ({
    draggable,
    droppable,
  }: {
    draggable?: Draggable | null;
    droppable?: Droppable | null;
  }) => {
    if (draggable && droppable) {
      move(draggable, droppable);
    }
  };

  const onDragEnd = ({
    draggable,
    droppable,
  }: {
    draggable?: Draggable | null;
    droppable?: Droppable | null;
  }) => {
    if (draggable && droppable) {
      move(draggable, droppable, false);

      // Log the final position
      const targetContainerId = isContainer(droppable.id)
        ? String(droppable.id)
        : getContainer(droppable.id);

      if (targetContainerId) {
        const { storeId, sectionId } = parseContainerId(targetContainerId);
        const containerItems = containers[targetContainerId] || [];
        const targetIndex = containerItems.indexOf(Number(draggable.id));

        moveMutation.mutate({
          id: Number(draggable.id),
          storeId,
          sectionId,
          index: targetIndex === -1 ? containerItems.length : targetIndex,
        });
      }
    }

    setActiveItem(null);
    // Containers are rebuilt as part of memo when data is reloaded.
  };

  return (
    <>
      <div class="flex items-center px-4">
        <h1 class="text-primary text-3xl font-bold">Items</h1>
      </div>
      <Show when={total() !== undefined}>
        <div class="px-4 text-sm">{total()} total items</div>
      </Show>

      <ItemsCheckerProvider>
        <Switch>
          <Match when={data.isPending}>
            <div class="px-4 pt-4 text-sm text-neutral-600">
              <span class="loading loading-spinner loading-sm mr-3" />
              Loading...
            </div>
          </Match>

          <Match when={data.isError}>
            <div class="px-4 pt-4">Error: {data.error?.message}</div>
          </Match>

          <Match when={!!data.data}>
            <DragDropProvider
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
              collisionDetector={closestContainerOrItem}
            >
              <DragDropSensors />
              <ItemsProvider containers={containers} itemMap={itemMap}>
                <div class="pt-4 pb-14 sm:pb-4">
                  {/* Global Unassigned Section */}
                  <UnassignedSection
                    containerId={getContainerId(undefined, undefined)}
                    mode="global"
                    disabled={moveMutation.isPending}
                  />

                  {/* Stores */}
                  <For each={data.data!.stores}>
                    {(store) => (
                      <StoreWithItems
                        store={store}
                        disabled={moveMutation.isPending}
                      />
                    )}
                  </For>
                </div>
              </ItemsProvider>
              <DragOverlay class="z-50">
                <Show when={activeItem()}>
                  <SortableItem
                    item={activeItem()!}
                    inset={1}
                    isOverlay
                    disabled={moveMutation.isPending}
                  />
                </Show>{" "}
              </DragOverlay>
            </DragDropProvider>
          </Match>
        </Switch>
      </ItemsCheckerProvider>
    </>
  );
}

function UnassignedSection(props: {
  containerId: string;
  mode: "global" | "store";
  disabled: boolean;
}) {
  const { containers, itemMap } = useItemsContext();
  const droppable = createMemo(() => createDroppable(props.containerId));

  const itemIds = createMemo(() => containers()[props.containerId] || []);

  const items = createMemo(() => {
    return itemIds()
      .map((id) => itemMap().get(id))
      .filter((item): item is Item => item !== undefined);
  });

  return (
    <div ref={droppable().ref}>
      <div
        class={cn(
          "sticky mb-px flex items-center gap-3 bg-white py-3 pr-3",
          props.mode === "global" ? "top-0 z-30" : "top-14 z-20",
          props.mode === "global" ? "pl-3" : "pl-7"
        )}
      >
        <div
          class={cn(
            "flex shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-700",
            props.mode === "global" ? "size-7" : "size-6"
          )}
        >
          <CircleQuestionMarkIcon
            class={props.mode === "global" ? "size-4" : "size-3.5"}
          />
        </div>
        <div
          class={cn(
            "tracking-tight text-neutral-500",
            props.mode === "global" ? "text-lg font-bold" : "font-semibold"
          )}
        >
          Unassigned
        </div>
        <div class="flex shrink-0 items-center justify-center rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-light text-neutral-500">
          {items().length}
        </div>

        <Show when={props.mode === "global"}>
          <div class="ml-auto">
            <AddItem mode="global" />
          </div>
        </Show>
      </div>

      <SortableProvider ids={itemIds()}>
        <For each={items()}>
          {(item) => (
            <>
              <div class="divider my-0 h-0" />
              <SortableItem
                inset={props.mode === "global" ? 1 : 2}
                item={item}
                disabled={props.disabled}
              />
            </>
          )}
        </For>
      </SortableProvider>
    </div>
  );
}

function StoreWithItems(props: { store: ItemListStore; disabled: boolean }) {
  const { containers } = useItemsContext();

  // Calculate total from containers (current state during drag)
  const total = createMemo(() => {
    let count = 0;
    // Store unassigned
    const storeUnassignedId = getContainerId(props.store.id, undefined);
    count += (containers()[storeUnassignedId] || []).length;

    // Store sections
    for (const section of props.store.sections) {
      const sectionId = getContainerId(props.store.id, section.id);
      count += (containers()[sectionId] || []).length;
    }
    return count;
  });

  const queryClient = useQueryClient();
  const sortMutation = useMutation(() => ({
    mutationFn: async () =>
      apiFetch(`/stores/${props.store.id}/organize`, {
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  }));

  return (
    <>
      {/* Store Header */}
      <div class="sticky top-0 z-30 flex items-center gap-3 bg-white px-3 py-3">
        <div class="bg-secondary/10 text-secondary flex size-7 shrink-0 items-center justify-center rounded-md">
          <StoreIcon class="size-4" />
        </div>
        <span class="text-secondary truncate text-lg font-bold tracking-tight">
          {props.store.name}
        </span>
        <div class="bg-secondary/10 text-secondary flex shrink-0 items-center justify-center rounded-md px-2 py-0.5 text-xs font-light">
          {total()}
        </div>
        <div class="ml-auto flex items-center gap-2">
          <button
            class="btn btn-sm btn-ghost btn-secondary"
            onClick={() => sortMutation.mutate()}
          >
            {sortMutation.isPending ? (
              <>
                <span class="loading loading-spinner" /> Sorting
              </>
            ) : (
              <>
                <SparklesIcon class="size-4" /> Sort
              </>
            )}
          </button>
          <AddItem store_id={props.store.id} mode="store" />
        </div>
      </div>

      {/* Store Unassigned */}
      <UnassignedSection
        containerId={getContainerId(props.store.id, undefined)}
        mode="store"
        disabled={props.disabled || sortMutation.isPending}
      />

      {/* Store Sections */}
      <For each={props.store.sections}>
        {(section) => (
          <SectionWithItems
            section={section}
            disabled={props.disabled || sortMutation.isPending}
          />
        )}
      </For>
    </>
  );
}

function SectionWithItems(props: {
  section: ItemListSection;
  disabled: boolean;
}) {
  const { containers, itemMap } = useItemsContext();

  const containerId = createMemo(() =>
    getContainerId(props.section.store_id, props.section.id)
  );
  const droppable = createMemo(() => createDroppable(containerId()));

  const itemIds = createMemo(() => containers()[containerId()] || []);

  const items = createMemo(() => {
    return itemIds()
      .map((id) => itemMap().get(id))
      .filter((item): item is Item => item !== undefined);
  });

  return (
    <div ref={droppable().ref}>
      {/* Section Header */}
      <div class="sticky top-14 z-20 mb-px flex items-center gap-3 bg-white py-3 pr-3 pl-7">
        <div class="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-md">
          <PackageIcon class="size-3.5" />
        </div>
        <span class="text-primary truncate font-semibold tracking-tight">
          {props.section.name}
        </span>
        <div class="bg-primary/10 text-primary flex shrink-0 items-center justify-center rounded-md px-2 py-0.5 text-xs font-light">
          {items().length}
        </div>
        <div class="ml-auto">
          <AddItem
            store_id={props.section.store_id}
            section_id={props.section.id}
            mode="section"
          />
        </div>
      </div>

      {/* Section Items */}
      <SortableProvider ids={itemIds()}>
        <For each={items()}>
          {(item) => (
            <>
              <div class="divider my-0 h-0" />
              <SortableItem inset={2} item={item} disabled={props.disabled} />
            </>
          )}
        </For>
      </SortableProvider>
    </div>
  );
}
