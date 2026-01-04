import { useMutation, useQueryClient } from "@tanstack/solid-query";
import { apiFetch } from "../../api";
import { SetStoreFunction } from "solid-js/store";
import ModifyDialog from "../modify-dialog";
import { showErrorToast } from "../toast/error-toast";

type EditData = {
  id: number;
  name: string;
  open: boolean;
};

export default function EditStoreDialog(props: {
  store: EditData;
  setStore: SetStoreFunction<EditData>;
}) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation(() => ({
    mutationFn: async (name: string) =>
      apiFetch(`/stores/${props.store.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["stores"] });
      props.setStore("open", false);
    },
    onError: () => showErrorToast("Failed to rename store"),
  }));

  return (
    <ModifyDialog
      title="Rename"
      mode="edit"
      mutation={updateMutation}
      open={() => props.store.open}
      setOpen={(value) => props.setStore("open", value)}
      currentName={props.store.name}
    />
  );
}
