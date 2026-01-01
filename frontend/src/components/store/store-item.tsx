import { Switch, Match, createSignal, Show, For, createMemo } from "solid-js";
import { Section, Store } from "../../data/stores";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useMutationState,
} from "@tanstack/solid-query";
import { apiFetch } from "../../api";
import {
  CheckIcon,
  CircleAlertIcon,
  CirclePlusIcon,
  GripVerticalIcon,
  InfoIcon,
  PackageIcon,
  PencilIcon,
  StoreIcon,
  TrashIcon,
} from "lucide-solid";
import Loading from "./loading";
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

  // Just created section for optimistic update
  const optimisticSection = useMutationState(() => ({
    filters: {
      mutationKey: ["addSection", props.store.id],
      status: "pending",
    },
    select: (mutation) => mutation.state.variables as string,
  }));

  return (
    <details
      class="bg-base-100 border-base-200 join-item collapse-arrow collapse border"
      open={open()}
      onToggle={() => setOpen((old) => !old)}
    >
      <summary class="collapse-title flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="bg-secondary/10 text-secondary flex size-7 shrink-0 items-center justify-center rounded-md">
            <StoreIcon class="size-4" />
          </div>
          <span class="text-lg font-bold tracking-tight">
            {props.store.name}
          </span>
        </div>
        <div class="flex gap-1">
          <button
            class="btn btn-sm btn-ghost btn-circle"
            onClick={(e) => {
              e.stopPropagation();
              props.onEdit();
            }}
          >
            <PencilIcon class="size-4" />
          </button>
          <button
            class="btn btn-sm btn-ghost btn-circle text-error"
            onClick={(e) => {
              e.stopPropagation();
              props.onDelete();
            }}
          >
            <TrashIcon class="size-4" />
          </button>
        </div>
      </summary>
      <div class="collapse-content px-2">
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
            <Show
              when={
                sections.data!.length === 0 &&
                optimisticSection().at(0) === undefined
              }
            >
              <div role="alert" class="alert">
                <InfoIcon class="size-5" />
                <span>No data yet</span>
              </div>
            </Show>

            <SectionList storeId={props.store.id} sections={sections.data!} />

            <Show when={optimisticSection().at(0) !== undefined}>
              <div class="divider my-0 h-0" />
              <SectionListItem name={optimisticSection()[0]} isOptimistic />
            </Show>

            <CreateSectionForm storeId={props.store.id} />
          </Match>
        </Switch>
      </div>
    </details>
  );
}

function SectionList(props: { storeId: number; sections: Section[] }) {
  const [activeItem, setActiveItem] = createSignal<Section | null>(null);
  const ids = createMemo(() => props.sections.map((sec) => sec.id));

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
      await new Promise((r) => setTimeout(r, 2000));
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
  );
}

function SectionListItem(props: {
  name: string;
  isOptimistic?: boolean;
  isDragging?: boolean;
  ref?: (el: HTMLDivElement) => void;
  dragActivators?: Record<string, unknown>;
  transform?: { x: number; y: number };
  class?: string;
}) {
  return (
    <div
      ref={props.ref}
      {...(props.dragActivators || {})}
      class={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-3 transition-colors",
        !props.isOptimistic && !props.isDragging && "hover:bg-base-200/50",
        props.isOptimistic && "opacity-60",
        props.isDragging && "bg-base-100 ring-primary/40 shadow-lg ring-1",
        props.class
      )}
      style={{
        transform: props.transform
          ? `translate3d(${props.transform.x}px, ${props.transform.y}px, 0)`
          : undefined,
      }}
    >
      <div class="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-md">
        {props.isOptimistic ? (
          <span class="loading loading-spinner size-4" />
        ) : (
          <PackageIcon class="size-4" />
        )}
      </div>
      <span class="text-base font-medium">{props.name}</span>
      <Show when={!props.isOptimistic && !props.isDragging}>
        <div class="ml-auto opacity-0 transition-opacity group-hover:opacity-50">
          <GripVerticalIcon class="size-4" />
        </div>
      </Show>
    </div>
  );
}

function SectionItem(props: { section: Section; disabled?: boolean }) {
  const sortable = createMemo(() => createSortable(props.section.id));
  const [state] = useDragDropContext()!;

  return (
    <SectionListItem
      name={props.section.name}
      ref={sortable().ref}
      dragActivators={props.disabled ? {} : sortable().dragActivators}
      transform={sortable().transform}
      class={cn(
        !props.disabled && "cursor-grab",
        (sortable().isActiveDraggable || props.disabled) && "opacity-60",
        state.active.draggable && "transition-transform"
      )}
    />
  );
}

function CreateSectionForm(props: { storeId: number }) {
  let formRef!: HTMLFormElement;

  const queryClient = useQueryClient();

  const createSectionMutation = useMutation(() => ({
    mutationKey: ["addSection", props.storeId],
    mutationFn: async (name: string) => {
      await new Promise((r) => setTimeout(r, 2000));
      await apiFetch(`/stores/${props.storeId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["stores", "sections", props.storeId],
      });
      formRef.reset();
    },
  }));

  const handleSubmit = (e: Event) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const name = formData.get("name") as string;
    createSectionMutation.mutate(name);
  };

  return (
    <div class="mt-4 px-1">
      <form
        class="group border-base-300 bg-base-200/30 hover:border-primary/40 hover:bg-base-200/50 focus-within:border-primary focus-within:bg-base-100 relative flex items-center gap-3 rounded-lg border-2 border-dashed p-3 transition-all duration-200 focus-within:shadow-sm"
        onSubmit={handleSubmit}
        ref={formRef}
      >
        <div class="bg-base-200 group-focus-within:bg-primary/10 group-focus-within:text-primary flex size-7 shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors">
          <CirclePlusIcon class="size-4" />
        </div>
        <input
          name="name"
          type="text"
          placeholder="Add a new section..."
          class="flex-1 bg-transparent font-medium placeholder:text-neutral-400 focus:outline-none"
          required
          disabled={createSectionMutation.isPending}
        />
        <button
          class="btn btn-sm btn-primary btn-circle opacity-0 transition-opacity group-focus-within:opacity-100"
          type="submit"
          disabled={createSectionMutation.isPending}
        >
          <Switch>
            <Match when={!createSectionMutation.isPending}>
              <CheckIcon class="size-4" />
            </Match>
            <Match when={createSectionMutation.isPending}>
              <span class="loading loading-spinner size-4" />
            </Match>
          </Switch>
        </button>
      </form>
    </div>
  );
}
