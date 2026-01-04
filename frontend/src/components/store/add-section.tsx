import { useMutation, useQueryClient } from "@tanstack/solid-query";
import { createSignal } from "solid-js";
import { apiFetch } from "../../api";
import { PlusIcon } from "lucide-solid";
import ModifyDialog from "../modify-dialog";
import { showErrorToast } from "../toast/error-toast";

export default function AddSectionDialog(props: { storeId: number }) {
  const [open, setOpen] = createSignal(false);
  const queryClient = useQueryClient();

  const createMutation = useMutation(() => ({
    mutationFn: async (name: string) =>
      apiFetch(`/stores/${props.storeId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["stores", "sections", props.storeId],
      });
      setOpen(false);
    },
    onError: () => showErrorToast("Failed to add section"),
  }));

  return (
    <ModifyDialog
      title="Add Section"
      mode="create"
      mutation={createMutation}
      open={open}
      setOpen={setOpen}
    >
      <button
        class="btn btn-sm btn-soft btn-secondary btn-circle"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <PlusIcon class="size-4" />
      </button>
    </ModifyDialog>
  );
}
