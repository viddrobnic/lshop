import { GripVerticalIcon } from "lucide-react";
import { useSortable } from "@dnd-kit/react/sortable";
import { closestCenter } from "@dnd-kit/collision";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Item } from "@/data/items";
import { useItemChecker } from "./item-checker-context";

export function ItemRow({
  item,
  index,
  containerId,
  inset,
  disabled,
}: {
  item: Item;
  index: number;
  containerId: string;
  inset: number;
  disabled: boolean;
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: item.id,
    index,
    group: containerId,
    disabled,
    collisionDetector: closestCenter,
  });
  const { isPendingChecked, isCommittingChecked, check, uncheck } =
    useItemChecker();
  const pending = isPendingChecked(item.id);
  const committing = isCommittingChecked(item.id);
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-4 border-t py-3 pr-3 text-sm",
        isDragging && "opacity-60",
        disabled && "opacity-60"
      )}
      style={{ paddingLeft: `calc(${String(inset)} * 1rem + 1rem)` }}
    >
      <Checkbox
        checked={pending}
        onCheckedChange={(value) => {
          if (value) check(item.id);
          else uncheck(item.id);
        }}
        disabled={disabled || committing}
        aria-label={`Mark ${item.name} as checked`}
      />
      <span className="flex-1">{item.name}</span>
      <button
        ref={handleRef}
        type="button"
        className="text-muted-foreground hover:bg-muted flex size-7 touch-none items-center justify-center rounded disabled:cursor-not-allowed"
        disabled={disabled}
        aria-label={`Drag ${item.name}`}
      >
        <GripVerticalIcon className="size-4" />
      </button>
    </div>
  );
}

export function ItemOverlayRow({ item, inset }: { item: Item; inset: number }) {
  return (
    <div
      className="bg-background ring-primary/40 flex items-center gap-4 rounded-lg py-3 pr-3 text-sm shadow-lg ring-1"
      style={{ paddingLeft: `calc(${String(inset)} * 1rem + 1rem)` }}
    >
      <span className="size-4" />
      <span className="flex-1">{item.name}</span>
      <GripVerticalIcon className="text-muted-foreground mr-1 size-4" />
    </div>
  );
}
