import { useMutation, useQueryClient } from "@tanstack/solid-query";
import { createSignal } from "solid-js";
import { apiFetch } from "../../api";
import { PlusIcon } from "lucide-solid";
import ModifyDialog from "../modify-dialog";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      setOpen(false);
    },
  }));

  const buttonClass = () => {
    switch (props.mode) {
      case "global":
        return "btn btn-secondary btn-soft";
      case "store":
        return "btn btn-secondary btn-ghost btn-sm";
      case "section":
        return "btn btn-primary btn-ghost btn-sm";
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
      <button class={buttonClass()} onClick={() => setOpen(true)}>
        <PlusIcon class="mr-1 size-4" />
        Add
      </button>
    </ModifyDialog>
  );
}
