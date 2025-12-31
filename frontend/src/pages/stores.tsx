import { Switch, Match, For } from "solid-js";
import { useQuery } from "@tanstack/solid-query";
import { apiFetch } from "../api";
import { Store } from "../data/stores";
import { CircleAlertIcon, InfoIcon } from "lucide-solid";
import AddStoreDialog from "../components/store/add-store";
import EditStoreDialog from "../components/store/edit-store";
import DeleteStoreDialog from "../components/store/delete-store";
import { createStore } from "solid-js/store";
import Loading from "../components/store/loading";
import StoreItem from "../components/store/store-item";

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
