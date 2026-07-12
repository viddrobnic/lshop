import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DragDropProvider,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { closestCenter } from "@dnd-kit/collision";
import {
  EllipsisIcon,
  GripVerticalIcon,
  PackageIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { queryKeys } from "@/data/query-keys";
import { reorderSections, type Section } from "@/data/stores";
import { cn } from "@/lib/utils";

import { DeleteSectionDialog, EditSectionDialog } from "./store-dialogs";

type SectionListProps = {
  storeId: number;
  sections: Section[];
};

export function SectionList({ storeId, sections }: SectionListProps) {
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [deletingSection, setDeletingSection] = useState<Section | null>(null);
  const queryClient = useQueryClient();
  const sectionKey = queryKeys.stores.sections(storeId);
  const reorderMutation = useMutation({
    mutationFn: (nextSections: Section[]) =>
      apiFetch(`/stores/${String(storeId)}/sections/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: nextSections.map((section) => section.id),
        }),
      }),
    onMutate: async (nextSections) => {
      await queryClient.cancelQueries({ queryKey: sectionKey });
      const previousSections = queryClient.getQueryData<Section[]>(sectionKey);
      queryClient.setQueryData(sectionKey, nextSections);
      return { previousSections };
    },
    onError: (_error, _sections, context) => {
      queryClient.setQueryData(sectionKey, context?.previousSections);
      toast.error("Failed to reorder sections");
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: sectionKey });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.operation.source?.id;
    setActiveSection(
      typeof id === "number"
        ? (sections.find((section) => section.id === id) ?? null)
        : null
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveSection(null);
    if (event.canceled || reorderMutation.isPending) {
      return;
    }

    const activeId = event.operation.source?.id;
    const targetId = event.operation.target?.id;
    if (typeof activeId !== "number" || typeof targetId !== "number") {
      return;
    }

    const nextSections = reorderSections(sections, activeId, targetId);
    if (nextSections !== sections) {
      reorderMutation.mutate(nextSections);
    }
  };

  return (
    <>
      <DragDropProvider
        sensors={[PointerSensor, KeyboardSensor]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col">
          {sections.map((section, index) => (
            <div key={section.id}>
              <SortableSectionRow
                section={section}
                index={index}
                disabled={reorderMutation.isPending}
                onEdit={() => {
                  setEditingSection(section);
                }}
                onDelete={() => {
                  setDeletingSection(section);
                }}
              />
              {index < sections.length - 1 ? <Separator /> : null}
            </div>
          ))}
        </div>
        <DragOverlay>
          {activeSection ? (
            <SectionRowContent section={activeSection} overlay />
          ) : null}
        </DragOverlay>
      </DragDropProvider>
      <EditSectionDialog
        storeId={storeId}
        section={editingSection}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSection(null);
          }
        }}
      />
      <DeleteSectionDialog
        storeId={storeId}
        section={deletingSection}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingSection(null);
          }
        }}
      />
    </>
  );
}

function SortableSectionRow({
  section,
  index,
  disabled,
  onEdit,
  onDelete,
}: {
  section: Section;
  index: number;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { ref, handleRef, isDragSource } = useSortable({
    id: section.id,
    index,
    disabled,
    collisionDetector: closestCenter,
  });

  return (
    <SectionRowContent
      ref={ref}
      section={section}
      dragging={isDragSource}
      disabled={disabled}
      handleRef={handleRef}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}

function SectionRowContent({
  section,
  overlay = false,
  dragging = false,
  disabled = false,
  handleRef,
  onEdit,
  onDelete,
  ref,
}: {
  section: Section;
  overlay?: boolean;
  dragging?: boolean;
  disabled?: boolean;
  handleRef?: (element: Element | null) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  ref?: (element: Element | null) => void;
}) {
  return (
    <div
      ref={ref}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-3 transition-colors",
        !overlay && "hover:bg-muted/50",
        overlay && "bg-popover ring-primary/40 shadow-lg ring-1",
        dragging && "opacity-60"
      )}
    >
      <div className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-md">
        <PackageIcon className="size-4" />
      </div>
      <span className="min-w-0 flex-1 truncate text-base font-medium">
        {section.name}
      </span>
      {!overlay ? (
        <div className="flex shrink-0 items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Actions for ${section.name}`}
              >
                <EllipsisIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={onEdit}>
                  <PencilIcon />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                  <TrashIcon />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            ref={handleRef}
            type="button"
            disabled={disabled}
            className="text-muted-foreground flex size-7 touch-none items-center justify-center rounded select-none enabled:cursor-grab enabled:active:cursor-grabbing disabled:opacity-50"
            aria-label={`Reorder ${section.name}`}
          >
            <GripVerticalIcon className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
