import { createContext, useContext } from "react";

export type AddItemTarget = { store_id?: number; section_id?: number };
type AddItemContextValue = { open: (target?: AddItemTarget) => void };

export const AddItemContext = createContext<AddItemContextValue | null>(null);

export function useAddItemDialog() {
  const context = useContext(AddItemContext);
  if (!context) {
    throw new Error(
      "useAddItemDialog must be used within AddItemDialogProvider"
    );
  }
  return context;
}
