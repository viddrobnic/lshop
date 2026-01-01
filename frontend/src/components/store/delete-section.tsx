import { useMutation, useQueryClient } from "@tanstack/solid-query";
import { apiFetch } from "../../api";
import DeleteDialog from "../delete-dialog";
import { Accessor, Setter } from "solid-js";

export default function DeleteSectionDialog(props: {
  id: Accessor<number>;
  storeId: Accessor<number>;
  name: Accessor<string>;
  open: Accessor<boolean>;
  setOpen: Setter<boolean>;
}) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation(() => ({
    mutationFn: async () =>
      apiFetch(`/sections/${props.id()}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["stores", "sections", props.storeId()],
      });
      props.setOpen(false);
    },
  }));

  return (
    <DeleteDialog
      title="Delete"
      resourceName={props.name()}
      mutation={deleteMutation}
      open={props.open}
      setOpen={props.setOpen}
    />
  );
}
