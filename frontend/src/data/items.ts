import { Section, Store } from "./stores";

export type Item = {
  id: number;
  store_id?: number;
  section_id?: number;
  name: string;
  checked: boolean;
  created_at: string;
  updated_at: string;
};

export type ItemListSection = Section & {
  items: Item[];
};

export type ItemListStore = Store & {
  unassigned: Item[];
  sections: ItemListSection[];
};

export type ItemList = {
  unassigned: Item[];
  stores: ItemListStore[];
};

export function getTotal(list: ItemList): number {
  let total = list.unassigned.length;
  for (const store of list.stores) {
    total += getTotalStore(store);
  }

  return total;
}

export function getTotalStore(store: ItemListStore): number {
  let total = store.unassigned.length;
  for (const section of store.sections) {
    total += section.items.length;
  }

  return total;
}
