import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { queryKeys } from "@/data/query-keys";
import { AddItemContext, type AddItemTarget } from "./add-item-dialog-context";

export function AddItemDialogProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<AddItemTarget>({});
  const [isOpen, setIsOpen] = useState(false);
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

  const focusName = () => {
    requestAnimationFrame(() =>
      inputRef.current?.focus({ preventScroll: true })
    );
  };
  useEffect(() => {
    if (isOpen) {
      formRef.current?.reset();
      focusName();
    }
  }, [isOpen]);

  const submit = async (addAnother: boolean) => {
    const form = formRef.current;
    if (!form?.reportValidity()) return;
    const name = new FormData(form).get("name");
    if (typeof name !== "string") return;
    try {
      await createItem.mutateAsync({ name, target });
    } catch {
      return;
    }
    await queryClient.invalidateQueries({ queryKey: queryKeys.items });
    if (addAnother) {
      form.reset();
      focusName();
    } else {
      setIsOpen(false);
    }
  };

  return (
    <AddItemContext.Provider
      value={{
        open: (nextTarget = {}) => {
          setTarget(nextTarget);
          setIsOpen(true);
        },
      }}
    >
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="sm:max-w-sm"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
          </DialogHeader>
          <form
            ref={formRef}
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
          <DialogFooter className="justify-between sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsOpen(false);
              }}
            >
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
                onClick={() => void submit(true)}
              >
                {createItem.isPending ? <Spinner /> : null}Create & Add Another
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AddItemContext.Provider>
  );
}
