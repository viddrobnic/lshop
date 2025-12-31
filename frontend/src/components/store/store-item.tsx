import { Switch, Match, createSignal, Show, For } from "solid-js";
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

            <For each={sections.data}>
              {(section) => (
                <>
                  <SectionItem section={section} />
                  <div class="divider my-2 h-0" />
                </>
              )}
            </For>

            <Show when={optimisticSection().at(0) !== undefined}>
              <div class="px-2 text-sm opacity-50">
                {optimisticSection()[0]}
              </div>
              <div class="divider my-2 h-0" />
            </Show>

            <CreateSectionForm storeId={props.store.id} />
          </Match>
        </Switch>
      </div>
    </details>
  );
}

function SectionItem(props: { section: Section }) {
  return <div class="px-2 text-sm">{props.section.name}</div>;
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
