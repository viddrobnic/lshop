import { Switch, Match, For, createSignal } from "solid-js";
import { useQuery } from "@tanstack/solid-query";
import { apiFetch } from "../api";
import { Section, Store } from "../data/stores";
import { CircleAlertIcon, InfoIcon, PencilIcon, TrashIcon } from "lucide-solid";
import AddStoreDialog from "../components/store/add-store";
import EditStoreDialog from "../components/store/edit-store";
import DeleteStoreDialog from "../components/store/delete-store";
import { createStore } from "solid-js/store";

export default function Stores() {
  const [editingStore, setEditingStore] = createStore({
    id: 0,
    name: "",
    open: false,
  });

  const [deletingStore, setDeletingStore] = createStore({
    id: 0,
    name: "",
    open: false,
  });

  const data = useQuery(() => ({
    queryKey: ["stores"],
    queryFn: async () => apiFetch<Store[]>("/stores"),
  }));

  return (
    <>
      <div class="flex items-center justify-between px-4">
        <h1 class="text-primary text-3xl font-bold">Stores</h1>
        <AddStoreDialog />
      </div>

      <EditStoreDialog store={editingStore} setStore={setEditingStore} />
      <DeleteStoreDialog store={deletingStore} setStore={setDeletingStore} />

      <Switch>
        <Match when={data.isPending}>
          <Loading />
        </Match>

        <Match when={data.isError}>
          <div class="px-4 pt-4">
            <div role="alert" class="alert alert-error alert-soft">
              <CircleAlertIcon class="size5" />
              <span>Error: {data.error?.message ?? "Unknown Error"}</span>
            </div>
          </div>
        </Match>

        <Match when={data.isSuccess}>
          <Switch>
            <Match when={data.data!.length === 0}>
              <div class="px-4 pt-4">
                <div role="alert" class="alert">
                  <InfoIcon class="size-5" />
                  <span>No data yet</span>
                </div>
              </div>
            </Match>
            <Match when={data.data!.length > 0}>
              <div class="px-4 pt-4">
                <div class="join join-vertical w-full rounded-lg shadow">
                  <For each={data.data!}>
                    {(store) => (
                      <StoreItem
                        store={store}
                        onEdit={() => {
                          setEditingStore({
                            id: store.id,
                            name: store.name,
                            open: true,
                          });
                        }}
                        onDelete={() => {
                          setDeletingStore({
                            id: store.id,
                            name: store.name,
                            open: true,
                          });
                        }}
                      />
                    )}
                  </For>
                </div>
              </div>
            </Match>
          </Switch>
        </Match>
      </Switch>
    </>
  );
}

function StoreItem(props: {
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
    <details
      class="bg-base-100 border-base-200 join-item collapse-arrow collapse border"
      open={open()}
      onClick={(e) => {
        e.preventDefault();
        setOpen((old) => !old);
      }}
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
      <div class="collapse-content text-sm">
        <Switch fallback={<Loading />}>
          <Match when={sections.data?.length === 0}>
            <div role="alert" class="alert">
              <InfoIcon class="size-5" />
              <span>No data yet</span>
            </div>
          </Match>
        </Switch>
      </div>
    </details>
  );
}

function Loading() {
  return (
    <div class="px-4 pt-4 text-sm text-neutral-600">
      <span class="loading loading-spinner loading-sm mr-3" />
      Loading...
    </div>
  );
}
