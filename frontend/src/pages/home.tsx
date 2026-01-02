import { useQuery } from "@tanstack/solid-query";
import { apiFetch } from "../api";
import { createMemo, Show, Switch, Match, For } from "solid-js";
import {
  type Item,
  type ItemList,
  ItemListSection,
  type ItemListStore,
  getTotal,
  getTotalStore,
} from "../data/items";
import { CircleQuestionMarkIcon, PackageIcon, StoreIcon } from "lucide-solid";
import { cn } from "../lib/utils";
import AddItem from "../components/items/add-item";

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
      <div class="flex items-center justify-between px-4">
        <h1 class="text-primary text-3xl font-bold">Items</h1>
        <AddItem mode="global" />
      </div>
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
              <UnassignedSection items={data.data!.unassigned} mode="global" />
            </Show>
            <For each={data.data!.stores}>
              {(store) => <Store store={store} />}
            </For>
          </div>
        </Match>
      </Switch>
    </>
  );
}

function UnassignedSection(props: { items: Item[]; mode: "global" | "store" }) {
  const inset = () => (props.mode === "global" ? 0 : 1);

  return (
    <>
      <div
        class="my-3 flex items-center gap-3 px-3"
        style={{
          "margin-left": `calc(${inset()} * 1rem)`,
        }}
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
          {props.items.length}
        </div>
      </div>

      <div class="divider my-0 h-0" />

      <For each={props.items}>
        {(item, idx) => (
          <>
            <ListItem inset={inset() + 1} item={item} />
            <Show when={idx() < props.items.length - 1}>
              <div class="divider my-0 h-0" />
            </Show>
          </>
        )}
      </For>
    </>
  );
}

function Store(props: { store: ItemListStore }) {
  const total = createMemo(() => getTotalStore(props.store));

  return (
    <>
      <div class="mt-1 flex items-center gap-3 px-3 py-3">
        <div class="bg-secondary/10 text-secondary flex size-7 shrink-0 items-center justify-center rounded-md">
          <StoreIcon class="size-4" />
        </div>
        <span class="text-secondary truncate text-lg font-bold tracking-tight">
          {props.store.name}
        </span>
        <div class="bg-secondary/10 text-secondary flex shrink-0 items-center justify-center rounded-md px-2 py-0.5 text-xs font-light">
          {total()}
        </div>
        <div class="ml-auto">
          <AddItem store_id={props.store.id} mode="store" />
        </div>
      </div>

      <div class="divider my-0 h-0" />

      <Show when={props.store.unassigned.length > 0}>
        <UnassignedSection items={props.store.unassigned} mode="store" />
      </Show>

      <For each={props.store.sections}>
        {(section) => <StoreSection section={section} />}
      </For>
    </>
  );
}

function StoreSection(props: { section: ItemListSection }) {
  return (
    <>
      <div class="mt-0.5 ml-4 flex items-center gap-3 px-3 py-3">
        <div class="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-md">
          <PackageIcon class="size-3.5" />
        </div>
        <span class="text-primary truncate font-semibold tracking-tight">
          {props.section.name}
        </span>
        <div class="bg-primary/10 text-primary flex shrink-0 items-center justify-center rounded-md px-2 py-0.5 text-xs font-light">
          {props.section.items.length}
        </div>
        <div class="ml-auto">
          <AddItem
            store_id={props.section.store_id}
            section_id={props.section.id}
            mode="section"
          />
        </div>
      </div>

      <div class="divider my-0 h-0" />

      <For each={props.section.items}>
        {(item, idx) => (
          <>
            <ListItem inset={2} item={item} />
            <Show when={idx() < props.section.items.length - 1}>
              <div class="divider my-0 h-0" />
            </Show>
          </>
        )}
      </For>
    </>
  );
}

function ListItem(props: { inset: number; item: Item }) {
  return (
    <div
      class="flex items-center gap-4 py-3 pr-3 pl-4 text-sm"
      style={{
        "margin-left": `calc(${props.inset} * 1rem)`,
      }}
    >
      <input
        type="checkbox"
        checked={false}
        class="checkbox checkbox-secondary checkbox-sm"
      />
      {props.item.name}
    </div>
  );
}
