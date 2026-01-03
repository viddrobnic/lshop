import { useMutation, useQueryClient } from "@tanstack/solid-query";
import { apiFetch } from "../../api";
import ModifyDialog from "../modify-dialog";
import { Accessor, Setter } from "solid-js";

export default function EditSectionDialog(props: {
  id: Accessor<number>;
  storeId: Accessor<number>;
  name: Accessor<string>;
  open: Accessor<boolean>;
  setOpen: Setter<boolean>;
}) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation(() => ({
    mutationFn: async (name: string) =>
      apiFetch(`/sections/${props.id()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["stores", "sections", props.storeId()],
      });
      props.setOpen(false);
    },
  }));

  return (
    <ModifyDialog
      title="Rename"
      mode="edit"
      mutation={updateMutation}
      open={props.open}
      setOpen={props.setOpen}
      currentName={props.name()}
    />
  );
}
