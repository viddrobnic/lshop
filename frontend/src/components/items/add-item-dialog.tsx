import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiFetch } from "@/api";
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

export type AddItemTarget = { store_id?: number; section_id?: number };

export function AddItemDialog({
  target,
  onClose,
}: {
  target: AddItemTarget | null;
  onClose: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const createItem = useMutation({
    mutationFn: ({ name, target }: { name: string; target: AddItemTarget }) =>
      apiFetch("/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ...target }),
      }),
    onError: () => toast.error("Failed to add item"),
  });

  const focusName = () => inputRef.current?.focus({ preventScroll: true });

  const submit = async (addAnother: boolean) => {
    if (!target) return;
    const form = formRef.current;
    if (!form?.reportValidity()) return;
    const name = new FormData(form).get("name");
    if (typeof name !== "string") return;
    if (addAnother) focusName();
    try {
      await createItem.mutateAsync({ name, target });
    } catch {
      return;
    }
    await queryClient.invalidateQueries({ queryKey: queryKeys.items });
    if (addAnother) {
      form.reset();
    } else {
      onClose();
    }
  };

  return (
    <ResponsiveDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ResponsiveDialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          formRef.current?.reset();
          focusName();
        }}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Add Item</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form
          ref={formRef}
          className="px-4 md:px-0"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(true);
          }}
        >
          <Label htmlFor="item-name">Name</Label>
          <Input
            ref={inputRef}
            id="item-name"
            name="name"
            required
            placeholder="Name"
            className="mt-2"
          />
        </form>
        <ResponsiveDialogFooter className="justify-between md:flex-row md:justify-between">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={createItem.isPending}
              onClick={() => void submit(false)}
            >
              {createItem.isPending ? <Spinner /> : null}Create
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={createItem.isPending}
              onPointerDown={(event) => {
                event.preventDefault();
              }}
              onClick={() => void submit(true)}
            >
              {createItem.isPending ? <Spinner /> : null}Create & Add Another
            </Button>
          </div>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
