import { useMutation, useQueryClient } from "@tanstack/solid-query";
import { createSignal } from "solid-js";
import { apiFetch } from "../../api";
import { PlusIcon } from "lucide-solid";
import ModifyDialog from "../modify-dialog";
import { cn } from "../../lib/utils";
import { showErrorToast } from "../toast/error-toast";

interface AddItemProps {
  store_id?: number;
  section_id?: number;
  mode: "global" | "store" | "section";
}

export default function AddItem(props: AddItemProps) {
  const [open, setOpen] = createSignal(false);
  const queryClient = useQueryClient();

  const createMutation = useMutation(() => ({
    mutationFn: async (name: string) =>
      apiFetch("/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          store_id: props.store_id,
          section_id: props.section_id,
        }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      setOpen(false);
    },
    onError: () => showErrorToast("Failed to add item"),
  }));

  const colorClass = (): string => {
    switch (props.mode) {
      case "global":
        return "btn-neutral";
      case "store":
        return "btn-secondary";
      case "section":
        return "btn-primary";
    }
  };

  return (
    <ModifyDialog
      title="Add Item"
      mode="create"
      mutation={createMutation}
      open={open}
      setOpen={setOpen}
    >
      <button
        class={cn("btn btn-soft btn-sm btn-neutral btn-circle", colorClass())}
        onClick={() => setOpen(true)}
      >
        <PlusIcon class="size-4" />
      </button>
    </ModifyDialog>
  );
}
