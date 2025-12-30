import { useQuery } from "@tanstack/solid-query";
import { apiFetch } from "../api";
import { createMemo, Show, Switch, Match, For } from "solid-js";
import { Item, ItemList, getTotal } from "../data/items";

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

  return (
    <div class="px-4 py-6">
      <div class="text-3xl font-bold">Items</div>
      <Show when={total() !== undefined}>
        <div class="text-sm text-neutral-600">{total()} total items</div>
      </Show>

      <Switch>
        <Match when={data.isPending}>
          <div>Loading...</div>
        </Match>
        <Match when={data.isError}>
          <div>Error: {data.error!.message}</div>
        </Match>
        <Match when={!!data.data}>
          <div class="pt-4">
            <Show when={data.data!.unassigned.length > 0}>
              <Unassigned items={data.data!.unassigned} title="Unassigned" />
            </Show>
            <For each={data.data!.stores}>
              {(store) => (
                <For each={store.sections}>
                  {(section) => (
                    <Unassigned items={section.items} title={section.name} />
                  )}
                </For>
              )}
            </For>
          </div>
        </Match>
      </Switch>
    </div>
  );
}

function Unassigned(props: { items: Item[]; title: string }) {
  return (
    <>
      <div class="font-semibold">{props.title}</div>
      <div class="divider h-0" />
      <For each={props.items}>
        {(item) => (
          <>
            <div class="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={item.checked}
                class="checkbox checkbox-secondary"
              />
              {item.name}
            </div>
            <div class="divider h-0" />
          </>
        )}
      </For>
    </>
  );
}
