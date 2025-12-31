import { useQuery } from "@tanstack/solid-query";
import { apiFetch } from "../api";
import { createMemo, Show, Switch, Match, For } from "solid-js";
import { type Item, type ItemList, getTotal } from "../data/items";

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
    <>
      <h1 class="text-primary px-4 text-3xl font-bold">Items</h1>
      <Show when={total() !== undefined}>
        <div class="px-4 text-sm">{total()} total items</div>
      </Show>

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
          <div class="pt-4">
            <Show when={data.data!.unassigned.length > 0}>
              <Unassigned items={data.data!.unassigned} title="Unassigned" />
            </Show>
            <For each={data.data!.stores}>
              {(store) => (
                <>
                  <div>{store.name}</div>
                  <Show when={store.unassigned.length > 0}>
                    <div>Unassigned</div>
                    <ListItems items={store.unassigned} inset={1} />
                  </Show>
                  <For each={store.sections}>
                    {(section) => (
                      <>
                        <div>{section.name}</div>
                        <ListItems items={section.items} inset={1} />
                      </>
                    )}
                  </For>
                </>
              )}
            </For>
          </div>
        </Match>
      </Switch>
    </>
  );
}

function Unassigned(props: { items: Item[]; title: string }) {
  return (
    <>
      <div class="font-semibold">{props.title}</div>
      <div class="divider h-0" />
      <ListItems items={props.items} inset={0} />
    </>
  );
}

function ListItems(props: { items: Item[]; inset: number }) {
  return (
    <For each={props.items}>
      {(item) => (
        <>
          <div
            class="flex items-center gap-3 px-3 text-sm"
            style={{
              "margin-left": `calc(${props.inset} * 1.2rem)`,
            }}
          >
            <input
              type="checkbox"
              checked={item.checked}
              class="checkbox checkbox-secondary checkbox-sm"
            />
            {item.name}
          </div>
          <div class="divider my-3 h-0" />
        </>
      )}
    </For>
  );
}
