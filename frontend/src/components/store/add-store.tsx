import { useMutation, useQueryClient } from "@tanstack/solid-query";
import { createSignal } from "solid-js";
import { apiFetch } from "../../api";
import { PlusIcon } from "lucide-solid";
import ModifyDialog from "../modify-dialog";

export default function AddStoreDialog() {
  const [open, setOpen] = createSignal(false);
  const queryClient = useQueryClient();

  const createMutation = useMutation(() => ({
    mutationFn: async (name: string) =>
      apiFetch("/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      setOpen(false);
    },
  }));

  return (
    <ModifyDialog
      title="Add Store"
      mode="create"
      mutation={createMutation}
      open={open}
      setOpen={setOpen}
    >
      <button class="btn btn-secondary btn-soft" onClick={() => setOpen(true)}>
        <PlusIcon class="mr-1 size-4" />
        Add
      </button>
    </ModifyDialog>
  );
}
