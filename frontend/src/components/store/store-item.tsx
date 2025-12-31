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
  InfoIcon,
  PencilIcon,
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
      <summary class="collapse-title flex items-center justify-between font-semibold">
        <span>{props.store.name}</span>
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

            <SectionList sections={sections.data!} />

            <Show when={optimisticSection().at(0) !== undefined}>
              <div class="p-2 text-sm opacity-50">{optimisticSection()[0]}</div>
              <div class="divider my-0 h-0" />
            </Show>

            <CreateSectionForm storeId={props.store.id} />
          </Match>
        </Switch>
      </div>
    </details>
  );
}

function SectionList(props: { sections: Section[] }) {
  const [activeItem, setActiveItem] = createSignal<Section | null>(null);
  const ids = createMemo(() => props.sections.map((sec) => sec.id));

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
        console.log("from:", fromIndex, "to:", toIndex);
      }
    }
    setActiveItem(null);
  };

  return (
    <DragDropProvider
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      collisionDetector={closestCenter}
    >
      <DragDropSensors />
      <SortableProvider ids={ids()}>
        <For each={props.sections}>
          {(section) => (
            <>
              <SectionItem section={section} />
              <div class="divider my-0 h-0" />
            </>
          )}
        </For>
      </SortableProvider>
      <DragOverlay>
        <Show when={activeItem()}>
          <div class="px-2 text-sm">{activeItem()!.name}</div>
        </Show>
      </DragOverlay>
    </DragDropProvider>
  );
}

function SectionItem(props: { section: Section }) {
  const sortable = createMemo(() => createSortable(props.section.id));
  const [state] = useDragDropContext()!;

  return (
    <div
      ref={sortable().ref}
      {...sortable().dragActivators}
      class="cursor-grab p-2 text-sm"
      classList={{
        "opacity-50": sortable().isActiveDraggable,
        "transition-transform": !!state.active.draggable,
      }}
      style={{
        transform: sortable().transform
          ? `translate3d(${sortable().transform.x}px, ${sortable().transform.y}px, 0)`
          : undefined,
      }}
    >
      {props.section.name}
    </div>
  );
}

function CreateSectionForm(props: { storeId: number }) {
  let formRef!: HTMLFormElement;

  const queryClient = useQueryClient();

  const createSectionMutation = useMutation(() => ({
    mutationKey: ["addSection", props.storeId],
    mutationFn: async (name: string) =>
      apiFetch(`/stores/${props.storeId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
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
    <>
      <form
        class="mt-4 flex items-center gap-x-2 px-2"
        onSubmit={handleSubmit}
        ref={formRef}
      >
        <CirclePlusIcon class="text-primary size-5" />
        <input
          name="name"
          type="text"
          placeholder="Add Section"
          class="input input-ghost input-sm w-full"
          required
          disabled={createSectionMutation.isPending}
        />
        <button
          class="btn btn-sm text-primary btn-ghost btn-circle"
          type="submit"
          disabled={createSectionMutation.isPending}
        >
          <Switch>
            <Match when={!createSectionMutation.isPending}>
              <CheckIcon />
            </Match>
            <Match when={createSectionMutation.isPending}>
              <span class="loading loading-spinner text-neutral size-4" />
            </Match>
          </Switch>
        </button>
      </form>
    </>
  );
}
