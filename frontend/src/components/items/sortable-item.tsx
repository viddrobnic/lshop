import { createMemo } from "solid-js";
import { Item } from "../../data/items";
import { createSortable, useDragDropContext } from "@thisbeyond/solid-dnd";
import { cn } from "../../lib/utils";
import { GripVerticalIcon } from "lucide-solid";
import { useMutation, useQueryClient } from "@tanstack/solid-query";
import { apiFetch } from "../../api";
import { useItemCheckerContext } from "./item-checker";

// Delay between item being checked and new state sent to the server.
// During this time user can uncheck the item
const ITEM_CHECKED_DELAY_MS = 1500;

export default function SortableItem(props: {
  inset: number;
  item: Item;
  isOverlay?: boolean;
  disabled?: boolean;
}) {
  const sortable = createMemo(() => {
    if (props.isOverlay) {
      return null;
    }

    return createSortable(props.item.id);
  });

  const dndState = () => {
    if (props.isOverlay) {
      return null;
    }

    const [state] = useDragDropContext()!;
    return state;
  };

  const queryClient = useQueryClient();
  const checkedMutation = useMutation(() => ({
    mutationFn: async () =>
      apiFetch(`/items/${props.item.id}/checked`, {
        method: "PUT",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["items"],
      });
    },
  }));

  const { isChecked, setChecked, setUnchecked } = useItemCheckerContext();

  const checked = () => isChecked(props.item.id);
  const onChecked = (checked: boolean) => {
    if (checked) {
      const t = setTimeout(
        () => checkedMutation.mutate(),
        ITEM_CHECKED_DELAY_MS
      );
      setChecked(props.item.id, t);
    } else {
      setUnchecked(props.item.id);
    }
  };

  // Only apply transform when something is being dragged
  const shouldTransform = () =>
    !props.isOverlay && dndState()?.active.draggable && sortable()?.transform;

  const dragActivators = () => {
    if (props.disabled) {
      return {};
    }

    return sortable()?.dragActivators || {};
  };

  return (
    <div
      ref={sortable()?.ref}
      class={cn(
        "flex items-center gap-4 py-3 pr-3 text-sm",
        // Change opacity if being dragged and not overlay
        !props.isOverlay && sortable()?.isActiveDraggable && "opacity-60",
        // Set transform when anything is being dragged
        !props.isOverlay &&
          dndState()?.active.draggable &&
          "transition-transform",
        // If it's overlay add a ring and shadow
        props.isOverlay &&
          "ring-primary/40 rounded-lg bg-white shadow-lg ring-1",
        // Disabled state
        (checkedMutation.isPending || props.disabled) && "opacity-60"
      )}
      style={{
        "padding-left": `calc(${props.inset} * 1rem + 1rem)`,
        transform: shouldTransform()
          ? `translate3d(${sortable()!.transform.x}px, ${sortable()!.transform.y}px, 0)`
          : undefined,
      }}
    >
      <input
        type="checkbox"
        class="checkbox checkbox-secondary checkbox-sm"
        checked={checked()}
        onChange={(e) => onChecked(e.currentTarget.checked)}
        disabled={
          props.isOverlay || checkedMutation.isPending || props.disabled
        }
      />
      <span class="flex-1">{props.item.name}</span>

      <div
        {...dragActivators()}
        class={cn(
          "flex size-7 shrink-0 touch-none items-center justify-center rounded pr-1 text-neutral-500 select-none",
          !props.disabled && "cursor-grab"
        )}
      >
        <GripVerticalIcon class="size-4" />
      </div>
    </div>
  );
}
