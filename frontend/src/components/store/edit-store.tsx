import { useMutation, useQueryClient } from "@tanstack/solid-query";
import { createEffect, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { apiFetch } from "../../api";
import { SetStoreFunction } from "solid-js/store";

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

  let dialogRef!: HTMLDialogElement;
  let formRef!: HTMLFormElement;

  createEffect(() => {
    if (props.store.open) {
      dialogRef.showModal();
    } else {
      dialogRef.close();
    }
  });

  const updateMutation = useMutation(() => ({
    mutationFn: async (name: string) =>
      apiFetch(`/stores/${props.store.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      props.setStore("open", false);
    },
  }));

  const handleSubmit = (e: Event) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const name = formData.get("name") as string;
    updateMutation.mutate(name);
  };

  return (
    <Portal>
      <dialog
        ref={dialogRef}
        class="modal modal-bottom sm:modal-middle"
        onClose={() => props.setStore("open", false)}
      >
        <div class="modal-box">
          <button
            class="btn btn-sm btn-circle btn-ghost absolute top-2 right-2"
            onClick={() => props.setStore("open", false)}
          >
            ✕
          </button>
          <h3 class="text-lg font-bold">Edit Store</h3>

          <form onSubmit={handleSubmit} ref={formRef}>
            <div class="py-4">
              <input
                name="name"
                type="text"
                placeholder="Store Name"
                class="input w-full"
                value={props.store.name}
                required
                autofocus
              />
            </div>

            <div class="modal-action">
              <button
                type="button"
                class="btn btn-ghost"
                onClick={() => props.setStore("open", false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                disabled={updateMutation.isPending}
              >
                <Show when={updateMutation.isPending}>
                  <span class="loading loading-spinner mr-1 size-4" />
                </Show>
                Update
              </button>
            </div>
          </form>
        </div>

        <div class="modal-backdrop">
          <button
            onClick={(e) => {
              e.preventDefault();
              props.setStore("open", false);
            }}
          >
            close
          </button>
        </div>
      </dialog>
    </Portal>
  );
}
