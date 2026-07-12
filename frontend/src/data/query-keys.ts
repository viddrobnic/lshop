export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  items: ["items"] as const,
  stores: {
    all: ["stores"] as const,
    sections: (storeId: number) => ["stores", "sections", storeId] as const,
  },
} as const;
