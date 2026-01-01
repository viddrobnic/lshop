import { Switch, Match, createSignal, Show, For, createMemo } from "solid-js";
import { Section, Store } from "../../data/stores";
import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query";
import { apiFetch } from "../../api";
import {
  CircleAlertIcon,
  CircleEllipsisIcon,
  GripVerticalIcon,
  InfoIcon,
  PackageIcon,
  PencilIcon,
  StoreIcon,
  TrashIcon,
} from "lucide-solid";
import Loading from "./loading";
import AddSectionDialog from "./add-section";
import EditSectionDialog from "./edit-section";
import DeleteSectionDialog from "./delete-section";

import {
  DragDropProvider,
  DragDropSensors,
  DragOverlay,
  SortableProvider,
  createSortable,
  closestCenter,
  useDragDropContext,
} from "@thisbeyond/solid-dnd";
import { cn } from "../../lib/utils";

export default function StoreItem(props: {
  store: Store;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = createSignal(false);

  const sections = useQuery(() => ({
    queryKey: ["stores", "sections", props.store.id],
    queryFn: async () =>
      apiFetch<Section[]>(`/stores/${props.store.id}/sections`),
    enabled: open(),
  }));

  return (
    <div class="relative">
      <details
        class="bg-base-100 border-base-200 join-item collapse-arrow collapse border overflow-visible"
        open={open()}
        onToggle={() => setOpen((old) => !old)}
      >
        <summary class="collapse-title flex items-center ps-12 pe-24 after:start-5 after:end-auto">
          <div class="flex min-w-0 items-center gap-3">
            <div class="bg-secondary/10 text-secondary flex size-7 shrink-0 items-center justify-center rounded-md">
              <StoreIcon class="size-4" />
            </div>
            <span class="truncate text-lg font-bold tracking-tight">
              {props.store.name}
            </span>
          </div>
        </summary>
        <div class="collapse-content overflow-visible px-2">
          <Switch>
            <Match when={sections.isPending}>
              <Loading />
            </Match>

            <Match when={sections.isError}>
              <div role="alert" class="alert alert-error alert-soft">
                <CircleAlertIcon class="size5" />
                <span>Error: {sections.error?.message ?? "Unknown Error"}</span>
              </div>
            </Match>

            <Match when={sections.isSuccess}>
              <Show when={sections.data!.length === 0}>
                <div role="alert" class="alert">
                  <InfoIcon class="size-5" />
                  <span>No data yet</span>
                </div>
              </Show>

              <Show when={sections.data!.length > 0}>
                <SectionList
                  storeId={props.store.id}
                  sections={sections.data!}
                />
              </Show>
            </Match>
          </Switch>
        </div>
      </details>
      <div class="absolute top-3 right-4 flex gap-1">
        <AddSectionDialog storeId={props.store.id} />
        <div class="dropdown dropdown-end">
          <div
            tabindex="0"
            role="button"
            class="btn btn-sm btn-ghost btn-circle"
          >
            <CircleEllipsisIcon class="size-4" />
          </div>
          <ul
            tabindex="-1"
            class="dropdown-content menu bg-base-200 rounded-box z-1 w-52 p-2 shadow-md"
          >
            <li>
              <a onClick={() => props.onEdit()}>
                <PencilIcon class="size-4" />
                Rename
              </a>
            </li>
            <li>
              <a onClick={() => props.onDelete()}>
                <TrashIcon class="size-4" />
                Delete
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function SectionList(props: { storeId: number; sections: Section[] }) {
  const [activeItem, setActiveItem] = createSignal<Section | null>(null);
  const ids = createMemo(() => props.sections.map((sec) => sec.id));

  // Single edit/delete dialog state for all sections
  const [editSection, setEditSection] = createSignal<Section | null>(null);
  const [deleteSection, setDeleteSection] = createSignal<Section | null>(null);

  const queryClient = useQueryClient();

  const onDragStart = ({
    draggable,
  }: {
    draggable: { id: string | number };
  }) => {
    const section = props.sections.find((s) => s.id === draggable.id);
    setActiveItem(section ?? null);
  };

  const onDragEnd = ({
    draggable,
    droppable,
  }: {
    draggable?: { id: string | number } | null;
    droppable?: { id: string | number } | null;
  }) => {
    if (draggable && droppable) {
      const currentIds = ids();
      const fromIndex = currentIds.indexOf(draggable.id as number);
      const toIndex = currentIds.indexOf(droppable.id as number);
      if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
        const newSections = props.sections.slice();
        newSections.splice(toIndex, 0, ...newSections.splice(fromIndex, 1));
        reorderMutation.mutate(newSections);
      }
    }
    setActiveItem(null);
  };

  const reorderMutation = useMutation(() => ({
    mutationFn: async (sections: Section[]) => {
      const ids = sections.map((sec) => sec.id);
      await apiFetch(`/stores/${props.storeId}/sections/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    },
    onMutate: async (sections, context) => {
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await context.client.cancelQueries({
        queryKey: ["stores", "sections", props.storeId],
      });

      // Snapshot the previous value
      const previousSections = context.client.getQueryData([
        "stores",
        "sections",
        props.storeId,
      ]) as Section[];

      // Optimistically update to the new value
      context.client.setQueryData(
        ["stores", "sections", props.storeId],
        sections
      );

      // Return a result with the snapshotted value
      return { previousSections };
    },
    onError: (_err, _sections, onMutateResult, context) => {
      // If the mutation fails,
      // use the result returned from onMutate to roll back
      context.client.setQueryData(
        ["stores", "sections", props.storeId],
        onMutateResult?.previousSections
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["stores", "sections", props.storeId],
      });
    },
  }));

  return (
    <>
      <DragDropProvider
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        collisionDetector={closestCenter}
      >
        <DragDropSensors />
        <SortableProvider ids={ids()}>
          <For each={props.sections}>
            {(section, idx) => (
              <>
                <SectionItem
                  section={section}
                  disabled={reorderMutation.isPending}
                  onEdit={() => setEditSection(section)}
                  onDelete={() => setDeleteSection(section)}
                />
                <Show when={idx() < props.sections.length - 1}>
                  <div class="divider my-0 h-0" />
                </Show>
              </>
            )}
          </For>
        </SortableProvider>
        <DragOverlay>
          <Show when={activeItem()}>
            <SectionListItem name={activeItem()!.name} isDragging />
          </Show>
        </DragOverlay>
      </DragDropProvider>
      <EditSectionDialog
        id={() => editSection()?.id ?? 0}
        storeId={() => props.storeId}
        name={() => editSection()?.name ?? ""}
        open={() => editSection() !== null}
        setOpen={(open) => !open && setEditSection(null)}
      />
      <DeleteSectionDialog
        id={() => deleteSection()?.id ?? 0}
        storeId={() => props.storeId}
        name={() => deleteSection()?.name ?? ""}
        open={() => deleteSection() !== null}
        setOpen={(open) => !open && setDeleteSection(null)}
      />
    </>
  );
}

function SectionListItem(props: {
  name: string;
  isDragging?: boolean;
  isAnyDragging?: boolean;
  ref?: (el: HTMLDivElement) => void;
  dragActivators?: Record<string, unknown>;
  transform?: { x: number; y: number };
  class?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  // Only apply transform when something is actively being dragged
  // This prevents the transform from breaking dropdown positioning when idle
  const shouldTransform = () => props.isAnyDragging && props.transform;

  return (
    <div
      ref={props.ref}
      class={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-3 transition-colors",
        !props.isDragging && "hover:bg-base-200/50",
        props.isDragging && "bg-base-100 ring-primary/40 shadow-lg ring-1",
        props.class
      )}
      style={{
        transform: shouldTransform()
          ? `translate3d(${props.transform!.x}px, ${props.transform!.y}px, 0)`
          : undefined,
      }}
    >
      <div class="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-md">
        <PackageIcon class="size-4" />
      </div>
      <span class="text-base font-medium">{props.name}</span>
      <Show when={!props.isDragging}>
        <div class="ml-auto flex items-center gap-1">
          <div class="dropdown dropdown-end">
            <div
              tabindex="0"
              role="button"
              class="btn btn-sm btn-ghost btn-circle"
            >
              <CircleEllipsisIcon class="size-4" />
            </div>
            <ul
              tabindex="-1"
              class="dropdown-content menu bg-base-200 rounded-box z-1 w-52 p-2 shadow-md"
            >
              <li>
                <a onClick={() => props.onEdit?.()}>
                  <PencilIcon class="size-4" />
                  Rename
                </a>
              </li>
              <li>
                <a onClick={() => props.onDelete?.()}>
                  <TrashIcon class="size-4" />
                  Delete
                </a>
              </li>
            </ul>
          </div>
          <div
            {...(props.dragActivators || {})}
            class="flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded text-neutral-500 select-none"
          >
            <GripVerticalIcon class="size-4" />
          </div>
        </div>
      </Show>
    </div>
  );
}

function SectionItem(props: {
  section: Section;
  disabled?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const sortable = createMemo(() => createSortable(props.section.id));
  const [state] = useDragDropContext()!;

  return (
    <SectionListItem
      name={props.section.name}
      ref={sortable().ref}
      dragActivators={props.disabled ? {} : sortable().dragActivators}
      transform={sortable().transform}
      isAnyDragging={!!state.active.draggable}
      class={cn(
        (sortable().isActiveDraggable || props.disabled) && "opacity-60",
        state.active.draggable && "transition-transform"
      )}
      onEdit={props.onEdit}
      onDelete={props.onDelete}
    />
  );
}
