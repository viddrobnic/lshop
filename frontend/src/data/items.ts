export type Section = {
  id: number;
  store_id: number;
  name: string;
  created_at: string;
  updated_at: string;
};

export type Item = {
  id: number;
  store_id?: number;
  section_id?: number;
  name: string;
  checked: boolean;
  created_at: string;
  updated_at: string;
};

export type Store = {
  id: number;
  name: string;
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
    total += store.unassigned.length;
    for (const section of store.sections) {
      total += section.items.length;
    }
  }

  return total;
}
