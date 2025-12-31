import { Switch, Match, For, createEffect, createSignal } from "solid-js";
import { useQuery } from "@tanstack/solid-query";
import { apiFetch } from "../api";
import { Section, Store } from "../data/stores";
import { CircleAlertIcon, InfoIcon } from "lucide-solid";

export default function Stores() {
  const data = useQuery(() => ({
    queryKey: ["stores"],
    queryFn: async () => apiFetch<Store[]>("/stores"),
  }));

  return (
    <>
      <h1 class="text-primary px-4 text-3xl font-bold">Stores</h1>

      <Switch fallback={<Loading />}>
        <Match when={data.isError}>
          <div class="px-4 pt-4">
            <div role="alert" class="alert alert-error alert-soft">
              <CircleAlertIcon class="size5" />
              <span>Error: {data.error?.message ?? "Unknown Error"}</span>
            </div>
          </div>
        </Match>

        <Match when={data.data?.length === 0}>
          <div class="px-4 pt-4">
            <div role="alert" class="alert">
              <InfoIcon class="size-5" />
              <span>No data yet</span>
            </div>
          </div>
        </Match>

        <Match when={!!data.data}>
          <div class="px-4 pt-4">
            <div class="join join-vertical w-full rounded shadow">
              <For each={data.data!}>
                {(store) => <StoreItem store={store} />}
              </For>
            </div>
          </div>
        </Match>
      </Switch>
    </>
  );
}

function StoreItem(props: { store: Store }) {
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
      <summary class="collapse-title font-semibold">{props.store.name}</summary>
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
