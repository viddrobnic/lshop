export type Store = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
};

export type Section = {
  id: number;
  store_id: number;
  name: string;
  created_at: string;
  updated_at: string;
};
