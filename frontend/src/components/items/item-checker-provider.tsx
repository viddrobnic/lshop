import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiFetch } from "@/api";
import { queryKeys } from "@/data/query-keys";
import { CHECK_DELAY_MS, ItemCheckerContext } from "./item-checker-context";

export function ItemCheckerProvider({ children }: { children: ReactNode }) {
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const [pendingIds, setPendingIds] = useState<Set<number>>(() => new Set());
  const queryClient = useQueryClient();

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
    },
    []
  );

  const clear = (itemId: number) => {
    const timer = timers.current.get(itemId);
    if (timer) clearTimeout(timer);
    timers.current.delete(itemId);
    setPendingIds((ids) => {
      const next = new Set(ids);
      next.delete(itemId);
      return next;
    });
  };
  const check = (itemId: number) => {
    if (timers.current.has(itemId)) return;
    setPendingIds((ids) => new Set(ids).add(itemId));
    timers.current.set(
      itemId,
      setTimeout(() => {
        timers.current.delete(itemId);
        void apiFetch(`/items/${String(itemId)}/checked`, { method: "PUT" })
          .then(() =>
            queryClient.invalidateQueries({ queryKey: queryKeys.items })
          )
          .catch(() => {
            setPendingIds((ids) => {
              const next = new Set(ids);
              next.delete(itemId);
              return next;
            });
            toast.error("Failed to mark item as checked");
          });
      }, CHECK_DELAY_MS)
    );
  };

  return (
    <ItemCheckerContext.Provider
      value={{
        isPendingChecked: (id) => pendingIds.has(id),
        check,
        uncheck: clear,
      }}
    >
      {children}
    </ItemCheckerContext.Provider>
  );
}
