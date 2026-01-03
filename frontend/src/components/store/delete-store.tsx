import { useMutation, useQueryClient } from "@tanstack/solid-query";
import { apiFetch } from "../../api";
import { SetStoreFunction } from "solid-js/store";
import DeleteDialog from "../delete-dialog";

type DeleteData = {
  id: number;
  name: string;
  open: boolean;
};

export default function DeleteStoreDialog(props: {
  store: DeleteData;
  setStore: SetStoreFunction<DeleteData>;
}) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation(() => ({
    mutationFn: async () =>
      apiFetch(`/stores/${props.store.id}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["stores"] });
      props.setStore("open", false);
    },
  }));

  return (
    <DeleteDialog
      title="Delete"
      resourceName={props.store.name}
      mutation={deleteMutation}
      open={() => props.store.open}
      setOpen={(value) => props.setStore("open", value)}
    />
  );
}
