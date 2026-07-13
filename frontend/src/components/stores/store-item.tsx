import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDownIcon,
  CircleAlertIcon,
  EllipsisIcon,
  InfoIcon,
  PencilIcon,
  StoreIcon,
  TrashIcon,
} from "lucide-react";

import { apiFetch } from "@/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { queryKeys } from "@/data/query-keys";
import type { Section, Store } from "@/data/stores";
import { cn } from "@/lib/utils";

import { SectionList } from "./section-list";
import { AddSectionDialog } from "./store-dialogs";

export function StoreItem({
  store,
  onEdit,
  onDelete,
}: {
  store: Store;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const sections = useQuery({
    queryKey: queryKeys.stores.sections(store.id),
    queryFn: () => apiFetch<Section[]>(`/stores/${String(store.id)}/sections`),
    enabled: open,
  });

  return (
    <div className="bg-card relative overflow-visible rounded-lg border">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 py-3 pr-24 pl-4 text-left"
            aria-label={`${open ? "Collapse" : "Expand"} ${store.name}`}
          >
            <div className="bg-secondary/10 text-secondary-foreground flex size-7 shrink-0 items-center justify-center rounded-md">
              <StoreIcon className="size-4" />
            </div>
            <span className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight">
              {store.name}
            </span>
            <ChevronDownIcon
              className={cn(
                "size-4 transition-transform",
                open && "rotate-180"
              )}
              aria-hidden="true"
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-visible px-2 pb-2">
          {sections.isPending ? (
            <div className="text-muted-foreground flex items-center gap-2 px-2 py-4 text-sm">
              <Spinner /> Loading...
            </div>
          ) : null}
          {sections.isError ? (
            <Alert variant="destructive" className="my-2">
              <CircleAlertIcon />
              <AlertDescription>
                Error: {sections.error.message}
              </AlertDescription>
            </Alert>
          ) : null}
          {sections.data?.length === 0 ? (
            <Alert className="my-2">
              <InfoIcon />
              <AlertDescription>No data yet</AlertDescription>
            </Alert>
          ) : null}
          {sections.data && sections.data.length > 0 ? (
            <SectionList storeId={store.id} sections={sections.data} />
          ) : null}
        </CollapsibleContent>
      </Collapsible>
      <div className="absolute top-3 right-3 flex items-center gap-1">
        <AddSectionDialog storeId={store.id} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Actions for ${store.name}`}
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
      </div>
    </div>
  );
}
