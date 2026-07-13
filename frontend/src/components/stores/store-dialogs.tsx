import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/responsive-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { queryKeys } from "@/data/query-keys";
import type { Section, Store } from "@/data/stores";

type NameDialogProps = {
  title: string;
  submitLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  isPending: boolean;
  onSubmit: (name: string) => void;
};

function NameDialog({
  title,
  submitLabel,
  open,
  onOpenChange,
  initialName = "",
  isPending,
  onSubmit,
}: NameDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <ResponsiveDialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus({ preventScroll: true });
        }}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const name = new FormData(event.currentTarget).get("name");
            if (typeof name === "string") {
              onSubmit(name);
            }
          }}
        >
          <div className="grid gap-2 px-4 md:px-0">
            <Label htmlFor="resource-name">Name</Label>
            <Input
              ref={inputRef}
              id="resource-name"
              name="name"
              defaultValue={initialName}
              placeholder="Name"
              required
              disabled={isPending}
            />
          </div>
          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              {submitLabel}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

type DeleteDialogProps = {
  resourceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onDelete: () => void;
};

function DeleteDialog({
  resourceName,
  open,
  onOpenChange,
  isPending,
  onDelete,
}: DeleteDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{resourceName}</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              onDelete();
            }}
          >
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function AddStoreDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const createStore = useMutation({
    mutationFn: (name: string) =>
      apiFetch("/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.stores.all });
      setOpen(false);
    },
    onError: () => {
      toast.error("Failed to add store");
    },
  });

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setOpen(true);
        }}
      >
        <PlusIcon data-icon="inline-start" />
        Add
      </Button>
      <NameDialog
        title="Add Store"
        submitLabel="Create"
        open={open}
        onOpenChange={setOpen}
        isPending={createStore.isPending}
        onSubmit={(name) => {
          createStore.mutate(name);
        }}
      />
    </>
  );
}

export function EditStoreDialog({
  store,
  onOpenChange,
}: {
  store: Store | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const renameStore = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      apiFetch(`/stores/${String(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.stores.all });
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to rename store");
    },
  });

  return (
    <NameDialog
      title="Rename"
      submitLabel="Update"
      open={store !== null}
      onOpenChange={onOpenChange}
      initialName={store?.name}
      isPending={renameStore.isPending}
      onSubmit={(name) => {
        if (store) {
          renameStore.mutate({ id: store.id, name });
        }
      }}
    />
  );
}

export function DeleteStoreDialog({
  store,
  onOpenChange,
}: {
  store: Store | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const deleteStore = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/stores/${String(id)}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.stores.all });
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to delete store");
    },
  });

  return (
    <DeleteDialog
      resourceName={store?.name ?? ""}
      open={store !== null}
      onOpenChange={onOpenChange}
      isPending={deleteStore.isPending}
      onDelete={() => {
        if (store) {
          deleteStore.mutate(store.id);
        }
      }}
    />
  );
}

export function AddSectionDialog({ storeId }: { storeId: number }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const createSection = useMutation({
    mutationFn: (name: string) =>
      apiFetch(`/stores/${String(storeId)}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.stores.sections(storeId),
      });
      setOpen(false);
    },
    onError: () => {
      toast.error("Failed to add section");
    },
  });

  return (
    <>
      <Button
        size="icon-sm"
        variant="secondary"
        aria-label="Add section"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <PlusIcon />
      </Button>
      <NameDialog
        title="Add Section"
        submitLabel="Create"
        open={open}
        onOpenChange={setOpen}
        isPending={createSection.isPending}
        onSubmit={(name) => {
          createSection.mutate(name);
        }}
      />
    </>
  );
}

export function EditSectionDialog({
  storeId,
  section,
  onOpenChange,
}: {
  storeId: number;
  section: Section | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const renameSection = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      apiFetch(`/sections/${String(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.stores.sections(storeId),
      });
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to rename section");
    },
  });

  return (
    <NameDialog
      title="Rename"
      submitLabel="Update"
      open={section !== null}
      onOpenChange={onOpenChange}
      initialName={section?.name}
      isPending={renameSection.isPending}
      onSubmit={(name) => {
        if (section) {
          renameSection.mutate({ id: section.id, name });
        }
      }}
    />
  );
}

export function DeleteSectionDialog({
  storeId,
  section,
  onOpenChange,
}: {
  storeId: number;
  section: Section | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const deleteSection = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/sections/${String(id)}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.stores.sections(storeId),
      });
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to delete section");
    },
  });

  return (
    <DeleteDialog
      resourceName={section?.name ?? ""}
      open={section !== null}
      onOpenChange={onOpenChange}
      isPending={deleteSection.isPending}
      onDelete={() => {
        if (section) {
          deleteSection.mutate(section.id);
        }
      }}
    />
  );
}
