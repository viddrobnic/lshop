import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiFetch } from "@/api";
import { queryKeys } from "@/data/query-keys";
import { CHECK_DELAY_MS, ItemCheckerContext } from "./item-checker-context";

export function ItemCheckerProvider({ children }: { children: ReactNode }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingIdsRef = useRef(new Set<number>());
  const committingIdsRef = useRef(new Set<number>());
  const mounted = useRef(false);
  const [pendingIds, setPendingIds] = useState<Set<number>>(() => new Set());
  const [committingIds, setCommittingIds] = useState<Set<number>>(
    () => new Set()
  );
  const queryClient = useQueryClient();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, []);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const flush = () => {
    timer.current = null;
    const batchIds = [...pendingIdsRef.current];
    if (batchIds.length === 0) return;

    pendingIdsRef.current = new Set();
    setPendingIds(pendingIdsRef.current);
    committingIdsRef.current = new Set([
      ...committingIdsRef.current,
      ...batchIds,
    ]);
    setCommittingIds(committingIdsRef.current);

    void Promise.allSettled(
      batchIds.map((itemId) =>
        apiFetch(`/items/${String(itemId)}/checked`, { method: "PUT" })
      )
    ).then(async (results) => {
      const failedCount = results.filter(
        (result) => result.status === "rejected"
      ).length;
      if (failedCount > 0) {
        toast.error(
          failedCount === 1
            ? "Failed to mark item as checked"
            : `Failed to mark ${String(failedCount)} items as checked`
        );
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.items });
      if (!mounted.current) return;
      const next = new Set(committingIdsRef.current);
      for (const itemId of batchIds) next.delete(itemId);
      committingIdsRef.current = next;
      setCommittingIds(next);
    });
  };

  const scheduleFlush = () => {
    clearTimer();
    timer.current = setTimeout(flush, CHECK_DELAY_MS);
  };

  const check = (itemId: number) => {
    if (
      pendingIdsRef.current.has(itemId) ||
      committingIdsRef.current.has(itemId)
    )
      return;
    pendingIdsRef.current = new Set(pendingIdsRef.current).add(itemId);
    setPendingIds(pendingIdsRef.current);
    scheduleFlush();
  };

  const uncheck = (itemId: number) => {
    if (committingIdsRef.current.has(itemId)) return;
    const next = new Set(pendingIdsRef.current);
    next.delete(itemId);
    pendingIdsRef.current = next;
    setPendingIds(next);
    if (next.size > 0) scheduleFlush();
    else clearTimer();
  };

  return (
    <ItemCheckerContext.Provider
      value={{
        isPendingChecked: (id) => pendingIds.has(id) || committingIds.has(id),
        isCommittingChecked: (id) => committingIds.has(id),
        check,
        uncheck,
      }}
    >
      {children}
    </ItemCheckerContext.Provider>
  );
}
