import { createContext, useContext } from "react";

export const CHECK_DELAY_MS = 1500;

export type ItemChecker = {
  isPendingChecked: (itemId: number) => boolean;
  check: (itemId: number) => void;
  uncheck: (itemId: number) => void;
};

export const ItemCheckerContext = createContext<ItemChecker | null>(null);

export function useItemChecker() {
  const context = useContext(ItemCheckerContext);
  if (!context) {
    throw new Error("useItemChecker must be used within ItemCheckerProvider");
  }
  return context;
}
